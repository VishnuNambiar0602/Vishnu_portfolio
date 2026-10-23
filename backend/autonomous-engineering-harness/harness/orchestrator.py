from __future__ import annotations
import json, uuid
from pathlib import Path
from typing import Any
import yaml
from rich.console import Console
from .openrouter import OpenRouterClient
from .repository import repository_map, read_files, repo_fingerprint, git
from .schemas import Architecture, DiffArtifact, ReviewDecision, ExecutionDecision
from .validator import validate_diff
from .executor import Executor, CircuitBreaker
from .prompts import ARCHITECT_SYSTEM, CODER_SYSTEM, EXECUTOR_SYSTEM, REVIEWER_SYSTEM

console = Console()

class Harness:
    def __init__(self, config_path: Path = Path("config.yaml")):
        self.config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
        self.models = self.config["models"]
        self.limits = self.config["limits"]
        self.safety = self.config["safety"]
        self.review_cfg = self.config["review"]

    def _write(self, run_dir: Path, name: str, data: Any):
        (run_dir / name).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")

    def _event(self, run_dir: Path, node: str, **detail):
        """Append one state transition to runs/<job>/trace.jsonl (the audit trail of the run)."""
        with (run_dir / "trace.jsonl").open("a", encoding="utf-8") as f:
            f.write(json.dumps({"node": node, **detail}, ensure_ascii=False) + "\n")

    def plan(self, request: str, repo: Path, run_dir: Path) -> Architecture:
        skeleton = repository_map(repo)
        self._write(run_dir, "repository_map.json", skeleton)
        client = OpenRouterClient(self.models["architect"])
        user = json.dumps({"requirements": request, "repository": skeleton}, ensure_ascii=False)
        arch = client.structured(ARCHITECT_SYSTEM, user, Architecture, temperature=0.1, max_tokens=10000)
        self._write(run_dir, "architecture.json", arch.model_dump())
        self._event(run_dir, "architect", tasks=[t.id for t in arch.tasks], summary=arch.summary)
        return arch

    def generate_task(self, request: str, arch: Architecture, task, repo: Path, run_dir: Path) -> DiffArtifact:
        files = read_files(repo, task.files, self.limits["max_file_chars"])
        client = OpenRouterClient(self.models["coder"])
        user = json.dumps({"request": request, "architecture": arch.model_dump(), "task": task.model_dump(), "files": files}, ensure_ascii=False)
        return client.structured(CODER_SYSTEM, user, DiffArtifact, temperature=0.05, max_tokens=16000)

    def choose_command(self, request: str, task, arch: Architecture, evidence: list[dict]) -> ExecutionDecision:
        client = OpenRouterClient(self.models["executor"])
        user = json.dumps({"request": request, "task": task.model_dump(), "architecture": arch.model_dump(), "evidence": evidence[-5:]}, ensure_ascii=False)
        return client.structured(EXECUTOR_SYSTEM, user, ExecutionDecision, temperature=0.0, max_tokens=1000)

    def review(self, request: str, arch: Architecture, repo: Path, evidence: list[dict]) -> ReviewDecision:
        # Reviewer receives global repository metadata plus changed-file contents, not a chat history.
        status = git(repo, "diff", "--")
        changed = [x for x in arch.file_plan if x.path]
        files = read_files(repo, [x.path for x in changed], self.limits["max_file_chars"])
        client = OpenRouterClient(self.models["reviewer"])
        user = json.dumps({"request": request, "architecture": arch.model_dump(), "git_diff": status[-60000:], "files": files, "evidence": evidence[-10:]}, ensure_ascii=False)
        return client.structured(REVIEWER_SYSTEM, user, ReviewDecision, temperature=0.0, max_tokens=5000)

    def apply_diff(self, repo: Path, diff: str):
        import subprocess
        p = subprocess.run(["git", "apply", "--whitespace=fix", "-"], cwd=repo, input=diff, text=True, capture_output=True)
        if p.returncode != 0:
            raise RuntimeError(f"git apply failed: {p.stderr[:4000]}")

    def run(self, request: str, repo: Path, *, apply: bool = False, allow_network: bool = False) -> Path:
        repo = repo.resolve()
        if not (repo / ".git").exists():
            raise RuntimeError(f"Repository is not a git repository: {repo}")
        job = uuid.uuid4().hex[:12]
        run_dir = Path("runs") / job
        run_dir.mkdir(parents=True, exist_ok=True)
        self._write(run_dir, "request.json", {"request": request, "repo": str(repo), "apply": apply, "allow_network": allow_network})
        console.print(f"[bold]AEH job[/bold] {job} — {repo}")

        architecture_replans = 0
        worker_patches = 0
        evidence: list[dict] = []
        arch = self.plan(request, repo, run_dir)
        pending = list(arch.tasks)

        while True:
            console.print("[cyan]Node 2[/cyan] generating bounded task diffs...")
            task_results = []
            halted = False
            for task in pending:
                while True:
                    artifact = self.generate_task(request, arch, task, repo, run_dir)
                    validation = validate_diff(repo, artifact.diff)
                    result = {"task_id": task.id, "diff": artifact.diff, "explanation": artifact.explanation, "validation": validation.as_dict()}
                    task_results.append(result)
                    evidence.append({"kind": "diff_validation", **result})
                    self._event(run_dir, "worker", task=task.id, patches_used=worker_patches)
                    self._event(run_dir, "validator", task=task.id, ok=validation.ok, errors=validation.errors)
                    if validation.ok:
                        if apply:
                            self.apply_diff(repo, artifact.diff)
                        break
                    console.print(f"[red]Invalid diff for {task.id}[/red]")
                    worker_patches += 1
                    if worker_patches > self.limits["max_worker_patches"]:
                        halted = True
                        break
                    # Retry the same task once more, now carrying the validator's error as evidence.
                    task.description += f"\nPrevious diff was rejected by validation: {'; '.join(validation.errors)[:1000]}"
                if halted:
                    break
            self._write(run_dir, "task_results.json", task_results)
            if halted:
                final = {"status": "HALT", "reason": "worker patch budget exhausted", "job": job, "evidence": evidence[-3:]}
                self._write(run_dir, "final_state.json", final)
                self._event(run_dir, "done", status="HALT", reason=final["reason"])
                return run_dir

            console.print("[cyan]Node 3[/cyan] verifying environment...")
            executor = Executor(repo, dry_run=not apply, allow_network=allow_network, deny_patterns=self.safety["deny_patterns"], timeout=self.limits["max_command_seconds"], max_commands=self.limits["max_commands_per_task"], max_output=self.limits["max_output_chars"])
            execution = []
            for task in arch.tasks:
                attempts = 0
                while attempts < self.limits["max_environment_retries"]:
                    decision = self.choose_command(request, task, arch, evidence)
                    if decision.action == "stop" or not decision.command:
                        execution.append({"task_id": task.id, "decision": decision.model_dump()})
                        break
                    attempts += 1
                    try:
                        result = executor.run(decision.command)
                    except CircuitBreaker as exc:
                        execution.append({"task_id": task.id, "circuit_breaker": str(exc)})
                        break
                    execution.append({"task_id": task.id, "decision": decision.model_dump(), "result": result})
                    evidence.append({"kind": "command", "task_id": task.id, **result})
                    if result["returncode"] == 0:
                        break
            self._write(run_dir, "execution.json", execution)
            self._event(run_dir, "executor", commands=[e.get("decision", {}).get("command") for e in execution if e.get("decision")])

            console.print("[cyan]Node 4[/cyan] attempting to disprove the implementation...")
            review = self.review(request, arch, repo, evidence)
            self._write(run_dir, "review.json", review.model_dump())
            console.print(f"Review: [bold]{review.status}[/bold]")
            self._event(run_dir, "reviewer", status=review.status, issues=[i.message for i in review.issues],
                        patches_used=worker_patches, replans_used=architecture_replans)

            if review.status == "PASS":
                final = {"status": "PASS", "job": job, "fingerprint": repo_fingerprint(repo), "review": review.model_dump()}
                self._write(run_dir, "final_state.json", final)
                self._event(run_dir, "done", status="PASS")
                return run_dir

            if review.status == "PATCH":
                worker_patches += 1
                if worker_patches > self.limits["max_worker_patches"]:
                    final = {"status": "HALT", "reason": "worker patch budget exhausted", "review": review.model_dump()}
                    self._write(run_dir, "final_state.json", final)
                    self._event(run_dir, "done", status="HALT", reason=final["reason"])
                    return run_dir
                console.print("[yellow]Bounded PATCH path: returning only the affected worker task(s).[/yellow]")
                # Feed only reviewer evidence back to the affected worker through a new task request.
                affected = []
                for issue in review.issues:
                    for task in arch.tasks:
                        if issue.file in task.files:
                            task.description += f"\nReviewer issue to fix: {issue.message}\nEvidence: {issue.evidence}"
                            if task not in affected:
                                affected.append(task)
                pending = affected or list(arch.tasks)
                continue

            architecture_replans += 1
            if architecture_replans > self.limits["max_architecture_replans"]:
                final = {"status": "HALT", "reason": "architecture re-plan budget exhausted", "review": review.model_dump()}
                self._write(run_dir, "final_state.json", final)
                self._event(run_dir, "done", status="HALT", reason=final["reason"])
                return run_dir
            console.print("[yellow]BLOCK: returning to Node 1 for one bounded re-plan.[/yellow]")
            request = request + "\n\nADVERSARIAL REVIEW EVIDENCE:\n" + json.dumps(review.model_dump())
            arch = self.plan(request, repo, run_dir)
            pending = list(arch.tasks)
