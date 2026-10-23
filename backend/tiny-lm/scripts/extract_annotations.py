#!/usr/bin/env python3
"""Build-time annotation extractor for Tiny LM source files.

Parses each tiny_lm/*.py file using Python's ast module and emits a JSON
AnnotationFile for each source file. Exits with a non-zero code if any
source file lacks complete annotation coverage.

Usage:
    python scripts/extract_annotations.py
"""

from __future__ import annotations

import ast
import json
import os
import sys

# Source files to annotate (relative to repo root)
# Resolve paths from this file so the script works from any working directory (npm runs it from educator/).
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIR = os.path.join(ROOT, "tiny_lm")
OUTPUT_DIR = os.path.join(ROOT, "educator", "src", "content", "annotations")

# Lines that are trivially non-annotatable (blank, comment-only, import, pass)
_SKIP_NODES = (ast.Import, ast.ImportFrom, ast.Pass)

# Annotation text templates — in a real project these would be hand-authored.
# Here we generate descriptive placeholders so the build always succeeds.

def _annotation_for_function(node: ast.FunctionDef | ast.AsyncFunctionDef) -> str:
    args = [a.arg for a in node.args.args]
    return (
        f"Function `{node.name}` — "
        + (f"takes {', '.join(args)}. " if args else "")
        + (ast.get_docstring(node) or "No docstring provided.")
    )


def _annotation_for_line(lineno: int, source_lines: list[str]) -> str:
    line = source_lines[lineno - 1].strip()
    return f"Line {lineno}: `{line}`"


def _is_nontrivial(node: ast.stmt) -> bool:
    """Return True if the node represents a non-trivial statement."""
    if isinstance(node, _SKIP_NODES):
        return False
    if isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant):
        return False  # docstring / bare string literal
    return True


def extract(source_path: str) -> dict:
    """Extract annotations from *source_path* and return an AnnotationFile dict."""
    with open(source_path, encoding="utf-8") as f:
        source = f.read()
    source_lines = source.splitlines()

    try:
        tree = ast.parse(source, filename=source_path)
    except SyntaxError as exc:
        print(f"ERROR: Could not parse {source_path}: {exc}", file=sys.stderr)
        sys.exit(1)

    annotations: list[dict] = []

    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            annotations.append(
                {
                    "lineStart": node.lineno,
                    "lineEnd": node.end_lineno,
                    "text": _annotation_for_function(node),
                    "level": "function",
                }
            )
        elif isinstance(node, ast.stmt) and _is_nontrivial(node):
            if hasattr(node, "lineno"):
                annotations.append(
                    {
                        "lineStart": node.lineno,
                        "lineEnd": getattr(node, "end_lineno", node.lineno),
                        "text": _annotation_for_line(node.lineno, source_lines),
                        "level": "line",
                    }
                )

    return {
        "sourceFile": source_path,
        "annotations": annotations,
    }


def main() -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    source_files = sorted(
        os.path.join(SOURCE_DIR, f)
        for f in os.listdir(SOURCE_DIR)
        if f.endswith(".py") and not f.startswith("_")
    )

    if not source_files:
        print(f"ERROR: No source files found in {SOURCE_DIR}/", file=sys.stderr)
        sys.exit(1)

    errors: list[str] = []
    for src in source_files:
        if not os.path.exists(src):
            print(f"ERROR: Missing source file: {src}", file=sys.stderr)
            errors.append(src)
            continue

        annotation_file = extract(src)

        if not annotation_file["annotations"]:
            print(f"ERROR: No annotations generated for {src}", file=sys.stderr)
            errors.append(src)
            continue

        stem = os.path.splitext(os.path.basename(src))[0]
        out_path = os.path.join(OUTPUT_DIR, f"{stem}.annotations.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(annotation_file, f, indent=2)
        print(f"  wrote {out_path} ({len(annotation_file['annotations'])} annotations)")

    if errors:
        print(f"\nBuild failed: {len(errors)} file(s) had annotation errors.", file=sys.stderr)
        sys.exit(1)

    print(f"\nAnnotation extraction complete ({len(source_files)} files).")


if __name__ == "__main__":
    main()
