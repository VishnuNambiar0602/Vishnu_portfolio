# Autonomous Engineering Harness (AEH)

A bounded, assembly-line software engineering harness inspired by the useful parts of Claude Code, but deliberately designed to avoid recursive agent loops.

## Architecture

```text
                         ┌──────────────────┐
                         │   User Request   │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │ Node 1: ARCHITECT       │
                    │ Deep reasoning / DAG    │
                    └────────────┬────────────┘
                                 │ blueprint
                                 ▼
                    ┌─────────────────────────┐
                    │ Node 2: CODE WORKER      │
                    │ Focused file diffs       │
                    └────────────┬────────────┘
                                 │ diff
                                 ▼
                    ┌─────────────────────────┐
                    │ DETERMINISTIC VALIDATOR  │
                    │ JSON / diff / syntax    │
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Node 3: EXECUTOR        │
                    │ Bash / Git / tests      │
                    └────────────┬────────────┘
                                 │ evidence
                                 ▼
                    ┌─────────────────────────┐
                    │ Node 4: REVIEWER        │
                    │ Whole-repo critic       │
                    └────────────┬────────────┘
                                 │
                    ┌────────────┴────────────┐
                    │ PASS / PATCH / BLOCK    │
                    └───────┬───────┬─────────┘
                            │       │
                           PASS   PATCH (bounded)
                            │       │
                            ▼       ▼
                         DONE     Worker
                                    │
                                    └── max 2

BLOCK → Node 1, max 1 re-plan → otherwise HALT
```

## Core design rules

1. Models never share conversational history.
2. The harness owns state; models consume structured artifacts.
3. The only backward edges are bounded PATCH and BLOCK → ARCHITECT.
4. The LLM never decides whether its own output is valid. Deterministic validators do.
5. Terminal truth comes from actual process exit codes and captured stdout/stderr.
6. `git push` is disabled unless explicitly enabled.
7. The default mode is dry-run.
8. Every job gets a persistent run directory with JSON artifacts.

## OpenRouter

OpenRouter exposes an OpenAI-compatible chat completions API and supports structured JSON Schema outputs for compatible models. AEH uses those structured outputs for architecture, execution decisions, and review decisions.

Set your key in the environment; it is intentionally not hard-coded into this repository:

```bash
cp .env.example .env
# edit .env and set OPENROUTER_API_KEY
```

## Install

### Windows PowerShell

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e .
```

### Linux/macOS

```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -e .
```

## Run

Point the harness at an existing repository:

```bash
aeh run "Add JWT authentication with refresh-token rotation" --repo C:\path\to\repo
```

Start safely first:

```bash
aeh run "Add a health endpoint" --repo ./myrepo
```

The default is dry-run. To actually apply worker diffs:

```bash
aeh run "Add a health endpoint" --repo ./myrepo --apply
```

To allow network commands, opt in explicitly:

```bash
aeh run "Implement and test the API" --repo ./myrepo --apply --allow-network
```

Git push requires both config permission and an explicit command-line flag.

## Commands

```bash
aeh map --repo ./myrepo
# repository skeleton

aeh run "..." --repo ./myrepo
# complete bounded pipeline

aeh validate --repo ./myrepo
# deterministic repository checks
```

## Artifacts

Each run creates:

```text
runs/<job-id>/
  request.json
  repository_map.json
  architecture.json
  task_results.json
  validation.json
  execution.json
  review.json
  final_state.json
```

These artifacts are the actual memory of the harness. The models are stateless workers.

## Why this avoids infinite loops

There is no generic `while agent != done` loop. The orchestrator is a finite state machine with explicit budgets:

- architecture replans: 1
- worker patches: 2
- environment retries: 2
- commands per task: 12
- command timeout: 120 seconds

After a budget is exhausted, the harness halts with evidence instead of feeding the same failure back indefinitely.

## Important production upgrades

This repository is a working foundation, not a claim of production hardening. Before running it against high-value repositories, add:

- container/VM sandboxing for command execution
- OS-level filesystem permissions
- secret redaction before model calls
- stronger language-specific AST validation
- repository-specific test policies
- provider/model health fallback
- encrypted run artifact storage
- human approval for migrations and destructive operations
