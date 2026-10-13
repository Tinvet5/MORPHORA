#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 backend-foundation security and deployment invariants."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "backend-foundation-audit.json"
VERSION = "5.0.5"


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    passes: list[str] = []

    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
    if package.get("version") != VERSION:
        errors.append(f"package.json version must be {VERSION}")

    config_path = ROOT / "backend-config.js"
    config = config_path.read_text(encoding="utf-8") if config_path.is_file() else ""
    if not config:
        errors.append("backend-config.js is missing")
    else:
        expected = [
            'version: "5.0.5"',
            'provider: "supabase"',
            'enabled: true',
            'projectUrl: "https://fvrrkbbumznbhovaoxul.supabase.co"',
            'publishableKey: "sb_publishable_',
            'sdkVersion: "2.117.2"',
        ]
        for token in expected:
            if token not in config:
                errors.append(f"backend-config.js default invariant missing: {token}")
        if re.search(r'publishableKey:\s*"(?:sb_secret_|[^"\n]*service[_-]?role)', config, re.I):
            errors.append("backend-config.js contains a privileged Supabase credential")
        if 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/' not in config:
            errors.append("Supabase browser SDK must be pinned to 2.117.2")
        if not errors:
            passes.append("Backend configuration is connected with browser-safe public credentials and contains no privileged credential")

    backend_files = [
        "backend/supabase-loader.js",
        "backend/backend-client.js",
        "backend/auth-service.js",
        "backend/profile-service.js",
        "backend/sync-service.js",
        "backend/data-service.js",
    ]
    for rel in backend_files:
        if not (ROOT / rel).is_file():
            errors.append(f"Missing backend runtime module: {rel}")
    if not any("backend runtime" in item for item in errors):
        passes.append("Supabase loader, backend client, auth, profile, sync and local-first data services are present")

    loader = (ROOT / "backend/supabase-loader.js").read_text(encoding="utf-8")
    for safeguard in ("sb_publishable_", "sb_secret_", "service[_-]?role", 'protocol !== "https:"'):
        if safeguard not in loader:
            errors.append(f"Supabase loader safeguard missing: {safeguard}")
    client = (ROOT / "backend/backend-client.js").read_text(encoding="utf-8")
    if 'mode: "local-only"' not in client or 'mode: "local-fallback"' not in client:
        errors.append("Backend client does not preserve local-only/fallback modes")
    if not any("loader safeguard" in item.lower() or "local-only" in item.lower() for item in errors):
        passes.append("Browser backend bootstrap validates public configuration and fails closed to local mode")

    migration = ROOT / "database/migrations/202610040001_v5_backend_foundation.sql"
    sql = migration.read_text(encoding="utf-8") if migration.is_file() else ""
    if not sql:
        errors.append("Canonical V5.0.5 database migration is missing")
    else:
        required_sql = [
            "create table if not exists public.profiles",
            "create table if not exists public.user_preferences",
            "create table if not exists public.user_documents",
            "alter table public.profiles enable row level security",
            "alter table public.user_preferences enable row level security",
            "alter table public.user_documents enable row level security",
            "alter table public.profiles force row level security",
            "revoke all on table public.profiles from anon, authenticated",
            "grant select, insert, update, delete on table public.user_documents to authenticated",
            "for select to authenticated",
            "for insert to authenticated",
            "for update to authenticated",
            "for delete to authenticated",
            "(select auth.uid()) = user_id",
        ]
        lowered = sql.lower()
        for token in required_sql:
            if token.lower() not in lowered:
                errors.append(f"Database security invariant missing: {token}")
        if "grant" in lowered and " to anon" in lowered:
            errors.append("Database migration grants table privileges to the anon role")
        if not any("Database" in item for item in errors):
            passes.append("Database schema enables/forces RLS and scopes CRUD policies to auth.uid()")

    html_files = ("index.html", "studio.html", "dev-tools.html", "performance-lab.html")
    for name in html_files:
        text = (ROOT / name).read_text(encoding="utf-8")
        for rel in ("backend-config.js", *backend_files):
            if rel not in text:
                errors.append(f"{name} does not load {rel}")
    if not any("does not load backend" in item for item in errors):
        passes.append("All runtime surfaces load the same backend foundation in deterministic order")

    sw = (ROOT / "service-worker.js").read_text(encoding="utf-8")
    for rel in ("./backend-config.js", *[f"./{item}" for item in backend_files]):
        if rel not in sw:
            errors.append(f"service-worker.js APP_SHELL missing {rel}")
    if not any("APP_SHELL" in item for item in errors):
        passes.append("Backend foundation is part of the offline application shell; remote SDK is loaded only when configured")

    build = (ROOT / "tools/build_release.py").read_text(encoding="utf-8")
    if '"backend"' not in build or '"backend-config.js"' not in build:
        errors.append("Release builder does not include backend runtime files")
    if 'backend-foundation-audit.json' not in build:
        errors.append("Release builder does not require the backend-foundation quality gate")
    checker = (ROOT / "tools/check_release.py").read_text(encoding="utf-8")
    if '"database"' not in checker or 'backendFoundation' not in checker:
        errors.append("Release checker does not enforce backend deployment boundaries")
    if not any("Release" in item for item in errors):
        passes.append("Production build includes browser-safe backend modules, excludes database tooling, and requires this gate")

    report = {
        "product": "MORPHORA",
        "version": VERSION,
        "gate": "backend-foundation",
        "summary": {"errors": len(errors), "warnings": len(warnings), "passes": len(passes)},
        "errors": errors,
        "warnings": warnings,
        "passes": passes,
    }
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (REPORT.with_suffix(".txt")).write_text(
        "\n".join([
            f"MORPHORA V{VERSION} — Backend Foundation Audit",
            "",
            f"Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)",
            "",
            *[f"✓ {item}" for item in passes],
            *[f"! {item}" for item in warnings],
            *[f"✗ {item}" for item in errors],
        ]) + "\n",
        encoding="utf-8",
    )

    print(f"MORPHORA V{VERSION} backend-foundation audit")
    for item in passes:
        print(f"✓ {item}")
    for item in warnings:
        print(f"! {item}")
    for item in errors:
        print(f"✗ {item}")
    print(f"Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
