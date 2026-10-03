#!/usr/bin/env python3
"""Shared validation primitives for MORPHORA V4.9.8."""

from __future__ import annotations

import json
import re
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VALIDATOR_VERSION = "4.9.8"
ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SAFE_PATH_RE = re.compile(r"^[A-Za-z0-9._\-/]+$")
CONTENT_STATUSES = {"draft", "review", "published", "unpublished"}
AVAILABILITY_STATUSES = {"available", "coming-soon"}
DIFFICULTIES = {"beginner", "intermediate", "advanced"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff"}


@dataclass(frozen=True)
class Issue:
    severity: str
    code: str
    message: str
    path: str = ""
    hint: str = ""


@dataclass
class ValidationReport:
    project_root: str
    validator_version: str = VALIDATOR_VERSION
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    issues: list[Issue] = field(default_factory=list)
    counts: dict[str, int] = field(default_factory=lambda: {
        "species": 0,
        "collections": 0,
        "views": 0,
        "labels": 0,
        "publishedViews": 0,
        "draftViews": 0,
        "dziViews": 0,
        "imageViews": 0,
        "assetsChecked": 0,
        "questionBanks": 0,
        "customQuestions": 0,
    })

    def add(self, severity: str, code: str, message: str, path: str = "", hint: str = "") -> None:
        self.issues.append(Issue(severity, code, message, path, hint))

    def error(self, code: str, message: str, path: str = "", hint: str = "") -> None:
        self.add("error", code, message, path, hint)

    def warning(self, code: str, message: str, path: str = "", hint: str = "") -> None:
        self.add("warning", code, message, path, hint)

    def passed(self, code: str, message: str, path: str = "") -> None:
        self.add("pass", code, message, path)

    @property
    def summary(self) -> dict[str, int]:
        return {
            "errors": sum(i.severity == "error" for i in self.issues),
            "warnings": sum(i.severity == "warning" for i in self.issues),
            "passes": sum(i.severity == "pass" for i in self.issues),
        }

    def to_dict(self) -> dict[str, Any]:
        return {
            "validatorVersion": self.validator_version,
            "generatedAt": self.generated_at,
            "projectRoot": self.project_root,
            "summary": self.summary,
            "counts": self.counts,
            "issues": [asdict(issue) for issue in self.issues],
        }

    def write(self, output_dir: Path) -> tuple[Path, Path]:
        output_dir.mkdir(parents=True, exist_ok=True)
        json_path = output_dir / "validation-report.json"
        text_path = output_dir / "validation-report.txt"
        json_path.write_text(json.dumps(self.to_dict(), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        lines = [
            f"MORPHORA V{self.validator_version} — Project Validation Report",
            f"Generated: {self.generated_at}",
            "",
            f"Errors: {self.summary['errors']}",
            f"Warnings: {self.summary['warnings']}",
            f"Passes: {self.summary['passes']}",
            "",
        ]
        for severity in ("error", "warning", "pass"):
            group = [i for i in self.issues if i.severity == severity]
            if not group:
                continue
            lines.append(severity.upper())
            for item in group:
                location = f" [{item.path}]" if item.path else ""
                lines.append(f"- {item.code}{location}: {item.message}")
                if item.hint:
                    lines.append(f"  Hint: {item.hint}")
            lines.append("")
        text_path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
        return json_path, text_path


def load_json(path: Path, report: ValidationReport, *, code: str = "JSON_INVALID") -> dict[str, Any] | None:
    if not path.is_file():
        report.error("FILE_MISSING", "Referenced JSON file does not exist.", path.as_posix())
        return None
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        report.error(code, f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}", path.as_posix())
        return None
    if not isinstance(value, dict):
        report.error(code, "Root JSON value must be an object.", path.as_posix())
        return None
    return value


def safe_repo_path(value: str) -> bool:
    if not isinstance(value, str) or not value.strip():
        return False
    value = value.strip()
    if value.startswith(("http://", "https://", "data:", "blob:")):
        return True
    if value.startswith("/") or "\\" in value or not SAFE_PATH_RE.match(value):
        return False
    parts = value.split("/")
    return all(part not in {"", ".", ".."} for part in parts)


def resolve_local(root: Path, value: str) -> Path | None:
    if not isinstance(value, str) or not value.strip():
        return None
    value = value.split("?", 1)[0].split("#", 1)[0].strip()
    if value.startswith(("http://", "https://", "data:", "blob:")):
        return None
    return root / value.lstrip("/")


def id_valid(value: Any) -> bool:
    return isinstance(value, str) and bool(ID_RE.fullmatch(value.strip()))
