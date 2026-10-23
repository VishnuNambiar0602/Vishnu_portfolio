from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field, ConfigDict

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

class FilePlan(StrictModel):
    path: str
    action: Literal["create", "modify", "delete"]
    purpose: str
    dependencies: list[str] = Field(default_factory=list)

class Task(StrictModel):
    id: str
    title: str
    description: str
    files: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)
    verification: list[str] = Field(default_factory=list)

class Architecture(StrictModel):
    summary: str
    assumptions: list[str] = Field(default_factory=list)
    constraints: list[str] = Field(default_factory=list)
    file_plan: list[FilePlan] = Field(default_factory=list)
    tasks: list[Task] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)

class DiffArtifact(StrictModel):
    task_id: str
    diff: str
    explanation: str

class ReviewIssue(StrictModel):
    severity: Literal["low", "medium", "high", "critical"]
    file: str
    message: str
    evidence: str

class ReviewDecision(StrictModel):
    status: Literal["PASS", "PATCH", "BLOCK"]
    issues: list[ReviewIssue] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)
    affected_files: list[str] = Field(default_factory=list)

class ExecutionDecision(StrictModel):
    action: Literal["run", "stop"]
    command: str = ""
    reason: str
    retryable: bool = False
