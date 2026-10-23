from __future__ import annotations
from pathlib import Path
import json
import typer
from rich.console import Console
from .orchestrator import Harness
from .repository import repository_map

app = typer.Typer(no_args_is_help=True, add_completion=False)
console = Console()

@app.command()
def map(repo: Path = typer.Option(Path("."), exists=True, file_okay=False, dir_okay=True)):
    """Print the repository skeleton used by the architect."""
    console.print_json(json.dumps(repository_map(repo.resolve())))

@app.command()
def run(
    request: str = typer.Argument(..., help="Engineering requirement."),
    repo: Path = typer.Option(Path("."), exists=True, file_okay=False, dir_okay=True),
    apply: bool = typer.Option(False, "--apply", help="Actually apply generated diffs and execute verification commands."),
    allow_network: bool = typer.Option(False, "--allow-network", help="Permit network/package operations."),
    config: Path = typer.Option(Path("config.yaml"), exists=True, dir_okay=False),
):
    """Run the bounded multi-agent engineering pipeline."""
    h = Harness(config)
    run_dir = h.run(request, repo, apply=apply, allow_network=allow_network)
    console.print(f"\n[bold green]Run artifacts:[/bold green] {run_dir.resolve()}")

@app.command()
def validate(repo: Path = typer.Option(Path("."), exists=True, file_okay=False, dir_okay=True)):
    """Run basic deterministic repository validation."""
    from .repository import git
    console.print("Branch:", git(repo, "branch", "--show-current").strip())
    console.print("Status:")
    console.print(git(repo, "status", "--short"))

if __name__ == "__main__":
    app()
