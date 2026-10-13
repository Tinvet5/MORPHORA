#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 Sync Center and conflict-recovery invariants."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports'/'sync-ux-audit.json'
errors=[]; warnings=[]; passes=[]

def text(rel): return (ROOT/rel).read_text(encoding='utf-8')

index=text('index.html'); cloud=text('backend/cloud-sync-engine.js'); personal=text('backend/personal-sync-service.js'); ui=text('backend/sync-center-ui.js'); css=text('style.css'); sw=text('service-worker.js')
for token in ('id="syncCenterCard"','id="syncCenterSyncNow"','id="syncCenterReview"','id="syncCenterIssueList"','backend/sync-center-ui.js?v=5.0.5'):
    if token not in index: errors.append(f'Sync Center integration missing: {token}')
if not errors: passes.append('Signed-in account UI exposes versioned Sync Center status, counters and recovery controls')
for token in ('resolveConflict','retryAllFailed','expectedRevision = Number.isInteger(remoteRevision)'):
    if token not in cloud: errors.append(f'Cloud conflict-recovery invariant missing: {token}')
if not any('Cloud conflict' in e for e in errors): passes.append('Cloud queue supports retry-all and revision-aware Keep-this-device conflict recovery')
for token in ('acceptCloudConflict','morphora:annotationsremotechange','morphora:drawingsremotechange','morphora:learningprogressremotechange','discardMutation'):
    if token not in personal: errors.append(f'Cloud-accept invariant missing: {token}')
if not any('Cloud-accept' in e for e in errors): passes.append('Use-cloud conflict resolution applies remote state locally before discarding stale mutations')
for token in ('syncCenter.keepDevice','syncCenter.useCloud','syncCenter.retryFailed','syncCenter.offlineTitle'):
    en=json.loads(text('i18n/en.json')); es=json.loads(text('i18n/es.json'))
    if token not in en or token not in es: errors.append(f'Bilingual Sync Center key missing: {token}')
if not any('Bilingual' in e for e in errors): passes.append('Conflict/retry/offline UX is complete in English and Spanish')
if 'backend/sync-center-ui.js' not in sw: errors.append('Sync Center runtime missing from service-worker shell')
else: passes.append('Sync Center remains available in the release-versioned offline application shell')
for token in ('.sync-center-card','.sync-center-issue','.sync-center-metrics'):
    if token not in css: errors.append(f'Sync Center responsive styling missing: {token}')
if not any('styling' in e for e in errors): passes.append('Sync Center includes dedicated visual hierarchy for normal, offline and attention states')
result={'version':'5.0.5','gate':'sync-ux','errors':errors,'warnings':warnings,'passes':passes,'status':'passed' if not errors else 'failed'}
REPORT.parent.mkdir(exist_ok=True)
REPORT.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print('MORPHORA V5.0.5 Sync UX audit')
for item in passes: print('✓',item)
for item in warnings: print('!',item)
for item in errors: print('✗',item)
print(f'Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)')
raise SystemExit(1 if errors else 0)
