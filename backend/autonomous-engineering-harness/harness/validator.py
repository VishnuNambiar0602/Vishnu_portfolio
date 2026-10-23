from __future__ import annotations
import re, subprocess
from pathlib import Path

class ValidationResult:
    def __init__(self, ok: bool, errors: list[str], warnings: list[str] | None = None):
        self.ok, self.errors, self.warnings = ok, errors, warnings or []
    def as_dict(self):
        return {"ok": self.ok, "errors": self.errors, "warnings": self.warnings}

def validate_diff(repo: Path, diff: str) -> ValidationResult:
    errors = []
    if not diff.strip():
        return ValidationResult(False, ["Empty diff"])
    if "diff --git " not in diff:
        errors.append("Diff does not contain a standard 'diff --git' header")
    if "<<<<<<<" in diff or ">>>>>>>" in diff:
        errors.append("Diff contains merge-conflict markers")
    # Apply check against index/worktree without changing files.
    p = subprocess.run(["git", "apply", "--check", "--whitespace=nowarn", "-"], cwd=repo, input=diff, text=True, capture_output=True)
    if p.returncode != 0:
        errors.append(f"git apply --check failed: {p.stderr.strip()[:2000]}")
    return ValidationResult(not errors, errors)

def validate_command(command: str, deny_patterns: list[str], allow_network: bool) -> ValidationResult:
    errors = []
    low = command.lower()
    for pattern in deny_patterns:
        if pattern.lower() in low:
            errors.append(f"Command matches safety deny pattern: {pattern}")
    network_tokens = ["curl", "wget", "invoke-webrequest", "irm ", "git clone", "git fetch", "git pull", "pip install", "npm install", "pnpm install", "yarn add"]
    if not allow_network and any(t in low for t in network_tokens):
        errors.append("Network/package operation requires --allow-network")
    return ValidationResult(not errors, errors)
