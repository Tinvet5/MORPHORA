#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 Study + Quiz synchronization invariants."""
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports'/'learning-progress-sync-audit.json'
VERSION='5.0.5'

def main()->int:
    errors=[]; warnings=[]; passes=[]
    package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
    if package.get('version') != VERSION: errors.append(f'package.json version must be {VERSION}')

    sync=(ROOT/'backend/personal-sync-service.js').read_text(encoding='utf-8')
    for token in ('captureLearningProgress','pullLearningProgress','learning_progress','quiz_history','mergeLearningStores','morphora:learningprogressremotechange','resetLearningProgressCloud'):
        if token not in sync: errors.append(f'Personal sync missing learning invariant: {token}')
    if not any('Personal sync' in e for e in errors): passes.append('Study progress and completed Quiz sessions use the account-scoped local-first sync pipeline')

    study=(ROOT/'study.js').read_text(encoding='utf-8')
    for token in ('morphora:learningprogresschange','morphora:learningprogressremotechange','applyRemoteProgress','reset: true'):
        if token not in study: errors.append(f'Study runtime missing cloud integration: {token}')
    if not any('Study runtime' in e for e in errors): passes.append('Study runtime emits local changes and accepts remote merged progress without rewriting the learning UI')

    service=(ROOT/'backend/sync-service.js').read_text(encoding='utf-8')
    for token in ('"learning_progress"','"quiz_history"'):
        if token not in service: errors.append(f'Sync document type missing: {token}')

    test=(ROOT/'tools/test_learning_progress_sync.js')
    if not test.is_file(): errors.append('Learning progress runtime test is missing')

    index=(ROOT/'index.html').read_text(encoding='utf-8')
    if f'backend/personal-sync-service.js?v={VERSION}' not in index: errors.append('index.html does not load the current personal sync runtime')

    build=(ROOT/'tools/build_release.py').read_text(encoding='utf-8')
    checker=(ROOT/'tools/check_release.py').read_text(encoding='utf-8')
    if 'learning-progress-sync-audit.json' not in build: errors.append('Release builder does not require learning-progress sync audit')
    if 'learningProgressSync' not in checker: errors.append('Release checker does not verify learningProgressSync metadata')
    if not any('Release' in e for e in errors): passes.append('Production deployment requires the V5.0.5 learning-progress quality gate')

    report={'product':'MORPHORA','version':VERSION,'gate':'learning-progress-sync','summary':{'errors':len(errors),'warnings':len(warnings),'passes':len(passes)},'errors':errors,'warnings':warnings,'passes':passes}
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'MORPHORA V{VERSION} Study/Quiz progress sync audit')
    for item in passes: print('✓',item)
    for item in warnings: print('!',item)
    for item in errors: print('✗',item)
    print(f'Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)')
    return 1 if errors else 0

if __name__=='__main__': raise SystemExit(main())
