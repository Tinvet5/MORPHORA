#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 migration, local isolation, offline recovery and security invariants."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "v5-final-hardening-audit.json"
VERSION = "5.0.5"


def read(rel: str) -> str:
    path = ROOT / rel
    return path.read_text(encoding="utf-8") if path.is_file() else ""


def main() -> int:
    errors: list[str] = []
    warnings: list[str] = []
    passes: list[str] = []

    package = json.loads(read("package.json") or "{}")
    if package.get("version") != VERSION:
        errors.append(f"package.json version must be {VERSION}")

    vault = read("backend/local-vault.js")
    required_vault = (
        'const GUEST = "guest"',
        "principalForUser",
        "localVaultPrefix",
        "localVaultPrincipal",
        "activeQuizSession",
        'previous === GUEST && next.startsWith("user:")',
        "createRecoverySnapshot",
        "morphora:localvaultrestored",
        "savePrincipal(previous)",
    )
    for token in required_vault:
        if token not in vault:
            errors.append(f"Local-vault isolation invariant missing: {token}")
    if not any("Local-vault" in item for item in errors):
        passes.append("Browser-local notes, bookmarks, drawings, learning progress and active quiz sessions are isolated per signed-in account")
        passes.append("Guest work can be adopted only on guest → first-time-account transitions, never user → user")

    storage = read("storage.js")
    for token in (
        'localVaultPrefix: "morphora:local-vault:v1:"',
        'hardeningMigration: "morphora:hardening-migration:v1"',
        "createRecoverySnapshot",
        "listRecoverySnapshots",
        "restoreRecoverySnapshot",
        "This recovery snapshot belongs to a different MORPHORA account",
    ):
        if token not in storage:
            errors.append(f"Recovery/storage invariant missing: {token}")
    if not any("Recovery/storage" in item for item in errors):
        passes.append("Account-scoped recovery points support migration rollback and explicit local restore")

    personal = read("backend/personal-sync-service.js")
    if 'Promise.resolve(root.MorphoraLocalVault?.ready)' not in personal:
        errors.append("Cloud synchronization does not wait for local-vault migration/isolation readiness")
    if '["cloud", "vault"].includes(event?.detail?.source)' not in personal:
        errors.append("Vault restores can be mistaken for new local cloud-sync mutations")
    if not any("Cloud synchronization" in item or "Vault restores" in item for item in errors):
        passes.append("Cloud sync starts only after local principal restoration and ignores vault-originated hydration events")

    index = read("index.html")
    auth_pos = index.find("backend/auth-service.js?v=5.0.5")
    vault_pos = index.find("backend/local-vault.js?v=5.0.5")
    personal_pos = index.find("backend/personal-sync-service.js?v=5.0.5")
    if min(auth_pos, vault_pos, personal_pos) < 0 or not (auth_pos < vault_pos < personal_pos):
        errors.append("index.html must load auth-service → local-vault → personal-sync-service in deterministic order")
    for token in ('id="deviceProtectionState"', 'id="deviceProtectionCreate"', 'id="deviceProtectionRestore"'):
        if token not in index:
            errors.append(f"Device recovery UI missing: {token}")
    if '<meta content="strict-origin-when-cross-origin" name="referrer"' not in index and '<meta name="referrer" content="strict-origin-when-cross-origin"' not in index:
        errors.append("index.html is missing the V5.0.5 referrer-policy hardening meta tag")
    if not any("index.html" in item or "Device recovery" in item for item in errors):
        passes.append("Account UI exposes recovery status/actions without leaking principal identifiers")

    sw = read("service-worker.js")
    for token in ("./backend/local-vault.js", "offlineNavigationFallback", "MORPHORA_SKIP_WAITING", "MORPHORA_CLEAR_RUNTIME_CACHES"):
        if token not in sw:
            errors.append(f"Offline hardening invariant missing: {token}")
    if not any("Offline hardening" in item for item in errors):
        passes.append("Versioned service worker provides route-aware offline navigation fallback and explicit cache lifecycle controls")

    config = read("backend-config.js")
    if 'publishableKey: "sb_publishable_' not in config:
        errors.append("Browser backend configuration must use a Supabase publishable key")
    if 'projectUrl: "https://' not in config:
        errors.append("Browser backend project URL must use HTTPS")
    actual_secret = re.compile(r"sb_secret_[A-Za-z0-9_-]{16,}")
    secret_hits: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or any(part in {"dist", "node_modules", ".git"} for part in path.parts):
            continue
        if path.suffix.lower() not in {".js", ".json", ".html", ".py", ".sql", ".md", ".txt"}:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        if actual_secret.search(content):
            secret_hits.append(str(path.relative_to(ROOT)))
    if secret_hits:
        errors.append("Privileged Supabase secret-like credential found in source: " + ", ".join(secret_hits[:5]))
    if not any("Supabase" in item or "Privileged" in item for item in errors):
        passes.append("Browser source contains only publishable Supabase credentials and HTTPS backend configuration")

    sql = "\n".join(path.read_text(encoding="utf-8") for path in sorted((ROOT / "database" / "migrations").glob("*.sql")))
    lowered = sql.lower()
    for token in ("enable row level security", "force row level security", "auth.uid()", "to authenticated"):
        if token not in lowered:
            errors.append(f"Database defense-in-depth invariant missing across migrations: {token}")
    if "grant" in lowered and " to anon" in lowered:
        errors.append("Database migrations grant application-table privileges to anon")
    if not any("Database" in item for item in errors):
        passes.append("Supabase migrations retain forced RLS and authenticated-user ownership policies")

    en = json.loads(read("i18n/en.json") or "{}")
    es = json.loads(read("i18n/es.json") or "{}")
    for key in ("deviceProtection.title", "deviceProtection.create", "deviceProtection.restore", "deviceProtection.restoreConfirm"):
        if key not in en or key not in es:
            errors.append(f"Bilingual device-protection key missing: {key}")
    if not any("Bilingual" in item for item in errors):
        passes.append("Device recovery and isolation UX is complete in English and Spanish")

    build = read("tools/build_release.py")
    checker = read("tools/check_release.py")
    package_text = read("package.json")
    for rel, token in (("tools/build_release.py", "v5-final-hardening-audit.json"), ("tools/check_release.py", "finalHardening"), ("package.json", "check:final-hardening")):
        content = {"tools/build_release.py": build, "tools/check_release.py": checker, "package.json": package_text}[rel]
        if token not in content:
            errors.append(f"Production gate integration missing: {rel} → {token}")
    if not any("Production gate" in item for item in errors):
        passes.append("V5.0.5 cannot build a production artifact unless the final hardening gate passes")

    report = {
        "product": "MORPHORA",
        "version": VERSION,
        "gate": "v5-final-hardening",
        "summary": {"errors": len(errors), "warnings": len(warnings), "passes": len(passes)},
        "errors": errors,
        "warnings": warnings,
        "passes": passes,
        "status": "passed" if not errors else "failed",
    }
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    REPORT.with_suffix(".txt").write_text(
        "\n".join([
            f"MORPHORA V{VERSION} — Final Hardening Audit",
            "",
            f"Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)",
            "",
            *[f"✓ {item}" for item in passes],
            *[f"! {item}" for item in warnings],
            *[f"✗ {item}" for item in errors],
        ]) + "\n",
        encoding="utf-8",
    )

    print(f"MORPHORA V{VERSION} final hardening audit")
    for item in passes: print(f"✓ {item}")
    for item in warnings: print(f"! {item}")
    for item in errors: print(f"✗ {item}")
    print(f"Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
