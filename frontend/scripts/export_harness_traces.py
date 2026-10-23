"""Run the real orchestrator against scripted model replies and save each run's trace.jsonl
for the website's replay widget (data/harness_traces.json). No model or network is involved."""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT.parent / "backend"
HARNESS = PROJECTS / "autonomous-engineering-harness"
sys.path.insert(0, str(HARNESS))
sys.path.insert(0, str(HARNESS / "tests"))

import test_orchestrator as T  # noqa: E402
from harness.orchestrator import Harness  # noqa: E402
from harness.schemas import DiffArtifact  # noqa: E402


def sh(cwd, *args):
    return subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True).stdout


def make_repo(base: Path):
    repo = base / "repo"
    repo.mkdir()
    sh(repo, "git", "init", "-q")
    sh(repo, "git", "config", "user.email", "t@example.com")
    sh(repo, "git", "config", "user.name", "t")
    (repo / "hello.py").write_text("print('hi')\n")
    sh(repo, "git", "add", ".")
    sh(repo, "git", "commit", "-qm", "init")
    (repo / "hello.py").write_text("print('hello')\n")
    diff = sh(repo, "git", "diff")
    sh(repo, "git", "checkout", "--", "hello.py")
    return repo, diff


def run_scenario(name, title, blurb, script_fn):
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        repo, diff = make_repo(base)
        os.chdir(base)
        h = Harness(HARNESS / "config.yaml")
        roles = {h.models[k]: k for k in ("architect", "coder", "executor", "reviewer")}
        script = script_fn(DiffArtifact(task_id="t1", diff=diff, explanation=""))

        class Fake:
            def __init__(self, model):
                self.role = roles[model]

            def structured(self, *_a, **_k):
                q = script[self.role]
                return q.pop(0) if len(q) > 1 else q[0]

        import harness.orchestrator as orch
        orch.OpenRouterClient = Fake
        orch.console.quiet = True
        run_dir = h.run("add a greeting to hello.py", repo)
        trace = [json.loads(line) for line in (run_dir / "trace.jsonl").read_text().splitlines()]
        final = json.loads((run_dir / "final_state.json").read_text())
        os.chdir(ROOT)
        return {"id": name, "title": title, "blurb": blurb, "final": final["status"], "reason": final.get("reason"), "trace": trace}


A, BAD = T.ARCH, DiffArtifact(task_id="t1", diff="not a diff", explanation="")
scenarios = [
    ("pass", "Clean pass", "The worker's diff applies, the check command succeeds, the reviewer passes it.",
     lambda good: {"architect": [A], "coder": [good], "executor": [T.RUN], "reviewer": [T.PASS]}),
    ("patch", "One bounded patch", "The reviewer asks for a fix. Only the affected task goes back to the worker.",
     lambda good: {"architect": [A], "coder": [good], "executor": [T.RUN], "reviewer": [T.PATCH, T.PASS]}),
    ("invalid", "Bad diff, retried", "The first diff fails `git apply --check`. The validator, not the model, rejects it.",
     lambda good: {"architect": [A], "coder": [BAD, good], "executor": [T.RUN], "reviewer": [T.PASS]}),
    ("block", "Block, one re-plan, halt", "The reviewer blocks twice. After one re-plan the harness stops instead of looping.",
     lambda good: {"architect": [A], "coder": [good], "executor": [T.RUN], "reviewer": [T.BLOCK]}),
]
out = {"limits": Harness(HARNESS / "config.yaml").limits,
       "scenarios": [run_scenario(*s) for s in scenarios]}
(ROOT / "data/harness_traces.json").write_text(json.dumps(out, indent=1))
for s in out["scenarios"]:
    print(f"{s['id']:8} {s['final']:5} {len(s['trace'])} events")
