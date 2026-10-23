from pathlib import Path
from harness.validator import validate_command, validate_diff

def test_deny_destructive_command():
    r = validate_command("rm -rf /", ["rm -rf /"], False)
    assert not r.ok

def test_network_requires_opt_in():
    r = validate_command("git pull", [], False)
    assert not r.ok

def test_empty_diff_rejected(tmp_path: Path):
    r = validate_diff(tmp_path, "")
    assert not r.ok
