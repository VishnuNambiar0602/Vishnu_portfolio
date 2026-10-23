"""Drives the real orchestrator with a scripted model client so the state machine is tested
without network access. Each role (architect, coder, executor, reviewer) pops its next canned reply."""
import json
import subprocess
from pathlib import Path

import pytest

from harness import orchestrator
from harness.orchestrator import Harness
from harness.schemas import Architecture, DiffArtifact, ExecutionDecision, ReviewDecision, ReviewIssue, Task

ROOT = Path(__file__).resolve().parents[1]


def sh(cwd, *args):
    subprocess.run(args, cwd=cwd, check=True, capture_output=True, text=True)


@pytest.fixture
def repo(tmp_path):
    r = tmp_path / "repo"
    r.mkdir()
    sh(r, "git", "init", "-q")
    sh(r, "git", "config", "user.email", "t@example.com")
    sh(r, "git", "config", "user.name", "t")
    (r / "hello.py").write_text("print('hi')\n")
    sh(r, "git", "add", ".")
    sh(r, "git", "commit", "-qm", "init")
    return r


@pytest.fixture
def good_diff(repo):
    (repo / "hello.py").write_text("print('hello')\n")
    diff = subprocess.run(["git", "diff"], cwd=repo, capture_output=True, text=True, check=True).stdout
    sh(repo, "git", "checkout", "--", "hello.py")
    return diff


ARCH = Architecture(summary="greet", tasks=[Task(id="t1", title="greeting", description="say hello", files=["hello.py"])])
PASS = ReviewDecision(status="PASS")
PATCH = ReviewDecision(status="PATCH", issues=[ReviewIssue(severity="medium", file="hello.py", message="needs test", evidence="none")])
BLOCK = ReviewDecision(status="BLOCK", issues=[ReviewIssue(severity="high", file="hello.py", message="wrong approach", evidence="x")])
RUN = ExecutionDecision(action="run", command="python hello.py", reason="smoke")


def install(monkeypatch, config, script):
    h = Harness(ROOT / "config.yaml")
    roles = {config["models"][k]: k for k in ("architect", "coder", "executor", "reviewer")}

    class Fake:
        def __init__(self, model):
            self.role = roles[model]

        def structured(self, *_a, **_k):
            queue = script[self.role]
            return queue.pop(0) if len(queue) > 1 else queue[0]

    monkeypatch.setattr(orchestrator, "OpenRouterClient", Fake)
    return h


def run(monkeypatch, tmp_path, repo, script):
    monkeypatch.chdir(tmp_path)
    h = install(monkeypatch, Harness(ROOT / "config.yaml").config, script)
    run_dir = h.run("add greeting", repo)
    final = json.loads((run_dir / "final_state.json").read_text())
    trace = [json.loads(line) for line in (run_dir / "trace.jsonl").read_text().splitlines()]
    return final, trace


def test_pass_on_first_review(monkeypatch, tmp_path, repo, good_diff):
    script = {"architect": [ARCH], "coder": [DiffArtifact(task_id="t1", diff=good_diff, explanation="")], "executor": [RUN], "reviewer": [PASS]}
    final, trace = run(monkeypatch, tmp_path, repo, script)
    assert final["status"] == "PASS"
    assert [e["node"] for e in trace] == ["architect", "worker", "validator", "executor", "reviewer", "done"]


def test_dry_run_leaves_repo_untouched(monkeypatch, tmp_path, repo, good_diff):
    script = {"architect": [ARCH], "coder": [DiffArtifact(task_id="t1", diff=good_diff, explanation="")], "executor": [RUN], "reviewer": [PASS]}
    run(monkeypatch, tmp_path, repo, script)
    assert (repo / "hello.py").read_text() == "print('hi')\n"


def test_invalid_diff_is_retried_then_accepted(monkeypatch, tmp_path, repo, good_diff):
    bad = DiffArtifact(task_id="t1", diff="not a diff", explanation="")
    good = DiffArtifact(task_id="t1", diff=good_diff, explanation="")
    script = {"architect": [ARCH], "coder": [bad, good], "executor": [RUN], "reviewer": [PASS]}
    final, trace = run(monkeypatch, tmp_path, repo, script)
    assert final["status"] == "PASS"
    assert [e["ok"] for e in trace if e["node"] == "validator"] == [False, True]


def test_invalid_diffs_halt_when_patch_budget_is_spent(monkeypatch, tmp_path, repo):
    bad = DiffArtifact(task_id="t1", diff="not a diff", explanation="")
    script = {"architect": [ARCH], "coder": [bad], "executor": [RUN], "reviewer": [PASS]}
    final, trace = run(monkeypatch, tmp_path, repo, script)
    assert final["status"] == "HALT" and "patch budget" in final["reason"]
    assert sum(e["node"] == "validator" for e in trace) == 3  # first attempt + 2 patches


def test_patch_then_pass_regenerates_only_affected_task(monkeypatch, tmp_path, repo, good_diff):
    script = {"architect": [ARCH], "coder": [DiffArtifact(task_id="t1", diff=good_diff, explanation="")], "executor": [RUN], "reviewer": [PATCH, PASS]}
    final, trace = run(monkeypatch, tmp_path, repo, script)
    assert final["status"] == "PASS"
    assert [e["status"] for e in trace if e["node"] == "reviewer"] == ["PATCH", "PASS"]


def test_repeated_patch_requests_halt(monkeypatch, tmp_path, repo, good_diff):
    script = {"architect": [ARCH], "coder": [DiffArtifact(task_id="t1", diff=good_diff, explanation="")], "executor": [RUN], "reviewer": [PATCH]}
    final, _ = run(monkeypatch, tmp_path, repo, script)
    assert final["status"] == "HALT" and "patch budget" in final["reason"]


def test_block_replans_once_then_halts(monkeypatch, tmp_path, repo, good_diff):
    script = {"architect": [ARCH], "coder": [DiffArtifact(task_id="t1", diff=good_diff, explanation="")], "executor": [RUN], "reviewer": [BLOCK]}
    final, trace = run(monkeypatch, tmp_path, repo, script)
    assert final["status"] == "HALT" and "re-plan" in final["reason"]
    assert sum(e["node"] == "architect" for e in trace) == 2  # initial plan + exactly one re-plan
