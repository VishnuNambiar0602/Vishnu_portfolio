from __future__ import annotations
import subprocess, time
from pathlib import Path
from .validator import validate_command

class CircuitBreaker(Exception):
    pass

class Executor:
    def __init__(self, repo: Path, *, dry_run: bool, allow_network: bool, deny_patterns: list[str], timeout: int, max_commands: int, max_output: int):
        self.repo = repo
        self.dry_run = dry_run
        self.allow_network = allow_network
        self.deny_patterns = deny_patterns
        self.timeout = timeout
        self.max_commands = max_commands
        self.max_output = max_output
        self.commands = 0
        self.error_streak = 0

    def run(self, command: str) -> dict:
        if self.commands >= self.max_commands:
            raise CircuitBreaker("Command budget exhausted")
        check = validate_command(command, self.deny_patterns, self.allow_network)
        if not check.ok:
            return {"command": command, "returncode": 126, "stdout": "", "stderr": "\n".join(check.errors), "blocked": True}
        self.commands += 1
        if self.dry_run:
            return {"command": command, "returncode": 0, "stdout": "[DRY RUN]", "stderr": "", "blocked": False}
        started = time.time()
        try:
            p = subprocess.run(command, cwd=self.repo, shell=True, text=True, capture_output=True, timeout=self.timeout)
            out = p.stdout[-self.max_output:]
            err = p.stderr[-self.max_output:]
            if p.returncode != 0:
                self.error_streak += 1
            else:
                self.error_streak = 0
            if self.error_streak >= 2:
                raise CircuitBreaker(f"Environment circuit breaker tripped after {self.error_streak} consecutive command failures")
            return {"command": command, "returncode": p.returncode, "stdout": out, "stderr": err, "blocked": False, "duration_s": round(time.time()-started, 3)}
        except subprocess.TimeoutExpired as exc:
            self.error_streak += 1
            if self.error_streak >= 2:
                raise CircuitBreaker("Environment circuit breaker tripped after repeated timeouts")
            return {"command": command, "returncode": 124, "stdout": str(exc.stdout or "")[-self.max_output:], "stderr": "Command timed out", "blocked": False}
