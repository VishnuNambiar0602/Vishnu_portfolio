from __future__ import annotations
import hashlib, json, os, subprocess
from pathlib import Path

IGNORE_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", ".idea", ".pytest_cache", "dist", "build"}
TEXT_EXTENSIONS = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".cpp", ".c", ".h", ".hpp", ".cs", ".php", ".rb", ".swift", ".kt", ".kts", ".sql", ".yaml", ".yml", ".json", ".toml", ".md", ".txt", ".html", ".css", ".scss", ".env.example"}

def git(repo: Path, *args: str) -> str:
    p = subprocess.run(["git", *args], cwd=repo, text=True, capture_output=True, timeout=30)
    if p.returncode != 0:
        return f"EXIT {p.returncode}\nSTDOUT:\n{p.stdout[-5000:]}\nSTDERR:\n{p.stderr[-5000:]}"
    return p.stdout

def repository_map(repo: Path, max_files: int = 200) -> dict:
    files = []
    for root, dirs, names in os.walk(repo):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for name in names:
            p = Path(root) / name
            rel = p.relative_to(repo).as_posix()
            if len(files) >= max_files:
                break
            item = {"path": rel, "size": p.stat().st_size, "ext": p.suffix.lower()}
            if p.suffix.lower() in TEXT_EXTENSIONS and p.stat().st_size < 100_000:
                try:
                    text = p.read_text(encoding="utf-8", errors="ignore")
                    lines = text.splitlines()
                    item["symbols"] = [line.strip()[:200] for line in lines if line.strip().startswith(("class ", "def ", "async def ", "function ", "interface ", "type ", "struct ", "enum ", "export class "))][:80]
                except OSError:
                    item["symbols"] = []
            files.append(item)
    return {"root": str(repo), "files": files, "git_status": git(repo, "status", "--short"), "git_branch": git(repo, "branch", "--show-current").strip()}

def read_files(repo: Path, paths: list[str], max_chars: int = 24000) -> dict[str, str]:
    out = {}
    for rel in paths:
        p = (repo / rel).resolve()
        if repo.resolve() not in p.parents and p != repo.resolve():
            continue
        if p.exists() and p.is_file():
            try:
                text = p.read_text(encoding="utf-8", errors="ignore")
                out[rel] = text[:max_chars]
            except OSError:
                pass
    return out

def repo_fingerprint(repo: Path) -> str:
    status = git(repo, "status", "--porcelain=v1")
    head = git(repo, "rev-parse", "HEAD").strip()
    return hashlib.sha256(f"{head}\n{status}".encode()).hexdigest()[:16]
