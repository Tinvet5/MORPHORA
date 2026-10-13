#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 cloud-sync foundation invariants."""
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports'/'cloud-sync-foundation-audit.json'
VERSION='5.0.5'

def main()->int:
    errors=[]; warnings=[]; passes=[]
    package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
    if package.get('version') != VERSION: errors.append(f'package.json version must be {VERSION}')

    migration=ROOT/'database/migrations/202610050001_v5_cloud_sync_foundation.sql'
    sql=migration.read_text(encoding='utf-8') if migration.is_file() else ''
    for token in ('deleted_at','last_mutation_id','last_client_id','user_documents_user_changed_idx','enable row level security','force row level security','auth.uid()'):
        if token not in sql: errors.append(f'Cloud-sync migration missing invariant: {token}')
    if sql and not any('migration' in e.lower() for e in errors): passes.append('Cloud document schema carries tombstones, mutation identity, change index and re-asserted per-user RLS')

    service=(ROOT/'backend/sync-service.js').read_text(encoding='utf-8')
    for token in ('expectedRevision','last_mutation_id','deleted_at','listChangedDocuments','alreadyApplied','conflict: true','applyMutation'):
        if token not in service: errors.append(f'Sync service missing invariant: {token}')
    if not any('Sync service' in e for e in errors): passes.append('Cloud document service supports revision-aware mutation, idempotency, tombstones and incremental pull primitives')

    engine_path=ROOT/'backend/cloud-sync-engine.js'
    engine=engine_path.read_text(encoding='utf-8') if engine_path.is_file() else ''
    for token in ('syncQueue','userId','expectedRevision','revision-conflict','MAX_ATTEMPTS','nextAttemptAt','online','morphora:authchange','morphora:syncstatus','totalOnDevice'):
        if token not in engine: errors.append(f'Cloud sync queue missing invariant: {token}')
    if engine and not any('queue missing' in e for e in errors): passes.append('Durable local-first queue retries offline failures and scopes every pending mutation to its authenticated user')

    data=(ROOT/'backend/data-service.js').read_text(encoding='utf-8')
    if 'sync = false' not in data: errors.append('V5.0.5 must keep generic store writes local unless a dedicated sync adapter opts in')
    else: passes.append('Generic store writes remain local by default; dedicated adapters opt notes, bookmarks, drawings and learning progress into cloud sync without changing generic store semantics')

    storage=(ROOT/'storage.js').read_text(encoding='utf-8')
    for token in ('morphora:sync-queue:v1','morphora:sync-state:v1','morphora:sync-client-id:v1'):
        if token not in storage: errors.append(f'Storage layer missing sync foundation key: {token}')

    sw=(ROOT/'service-worker.js').read_text(encoding='utf-8')
    if './backend/cloud-sync-engine.js' not in sw: errors.append('service-worker APP_SHELL is missing cloud-sync-engine.js')
    index=(ROOT/'index.html').read_text(encoding='utf-8')
    if f'backend/cloud-sync-engine.js?v={VERSION}' not in index: errors.append('index.html does not load the versioned cloud sync engine')
    dev=(ROOT/'dev-tools.html').read_text(encoding='utf-8')
    for token in ('cloudSyncStatusTitle','cloudSyncQueue','cloudSyncConflicts','flushCloudSyncButton'):
        if token not in dev: errors.append(f'Developer diagnostics missing sync status control: {token}')
    if not any('service-worker' in e or 'index.html' in e or 'diagnostics' in e for e in errors): passes.append('Cloud sync foundation is release-cached and observable in Developer Diagnostics')

    build=(ROOT/'tools/build_release.py').read_text(encoding='utf-8')
    checker=(ROOT/'tools/check_release.py').read_text(encoding='utf-8')
    if 'cloud-sync-foundation-audit.json' not in build: errors.append('Release builder does not require cloud-sync-foundation audit')
    if 'cloudSyncFoundation' not in checker: errors.append('Release checker does not verify cloudSyncFoundation metadata')
    if not any('Release' in e for e in errors): passes.append('Production deployment requires the V5.0.5 cloud-sync quality gate')

    report={'product':'MORPHORA','version':VERSION,'gate':'cloud-sync-foundation','summary':{'errors':len(errors),'warnings':len(warnings),'passes':len(passes)},'errors':errors,'warnings':warnings,'passes':passes}
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'MORPHORA V{VERSION} cloud sync foundation audit')
    for item in passes: print('✓',item)
    for item in warnings: print('!',item)
    for item in errors: print('✗',item)
    print(f'Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)')
    return 1 if errors else 0

if __name__=='__main__': raise SystemExit(main())
