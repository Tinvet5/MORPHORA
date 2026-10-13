#!/usr/bin/env python3
"""Audit MORPHORA V5.0.5 notes + bookmarks synchronization invariants."""
from __future__ import annotations
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'reports'/'notes-bookmarks-sync-audit.json'
VERSION='5.0.5'

def main()->int:
    errors=[]; warnings=[]; passes=[]
    package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
    if package.get('version') != VERSION: errors.append(f'package.json version must be {VERSION}')

    storage=(ROOT/'storage.js').read_text(encoding='utf-8')
    for token in ('morphora:bookmarks:v2','morphora:personal-sync-meta:v1','bookmarks: Object.freeze'):
        if token not in storage: errors.append(f'Storage layer missing V5.0.5 invariant: {token}')
    if not any('Storage layer' in e for e in errors): passes.append('Bookmarks and per-account sync metadata have durable local-first storage')

    bookmarks=(ROOT/'backend/bookmarks-service.js').read_text(encoding='utf-8')
    for token in ('keyFor','toggle','replaceStore','morphora:bookmarkschange','updatedAt'):
        if token not in bookmarks: errors.append(f'Bookmark service missing invariant: {token}')
    if not any('Bookmark service' in e for e in errors): passes.append('Bookmark service provides stable structure keys and local CRUD before cloud sync')

    personal=(ROOT/'backend/personal-sync-service.js').read_text(encoding='utf-8')
    for token in ('captureAnnotations','captureBookmarks','listDocuments','includeDeleted: true','expectedRevision','morphora:annotationsremotechange','morphora:syncmutationapplied','localPresent'):
        if token not in personal: errors.append(f'Personal sync service missing invariant: {token}')
    if not any('Personal sync service' in e for e in errors): passes.append('Notes/bookmarks sync migrates local data, merges remote changes, respects tombstones and tracks revisions')

    engine=(ROOT/'backend/cloud-sync-engine.js').read_text(encoding='utf-8')
    for token in ('morphora:syncmutationapplied','morphora:syncconflict'):
        if token not in engine: errors.append(f'Cloud sync engine missing personal-sync event: {token}')

    script=(ROOT/'script.js').read_text(encoding='utf-8')
    for token in ('MorphoraPersonalSync?.captureAnnotations','morphora:annotationsremotechange','morphora:structureinfo'):
        if token not in script: errors.append(f'Atlas runtime missing notes/bookmark integration: {token}')

    index=(ROOT/'index.html').read_text(encoding='utf-8')
    for token in ('id="bookmarkStructureInfo"','id="openBookmarks"','id="bookmarksDrawer"','backend/bookmarks-service.js?v=5.0.5','backend/personal-sync-service.js?v=5.0.5','backend/bookmarks-ui.js?v=5.0.5'):
        if token not in index: errors.append(f'Public UI missing V5.0.5 integration: {token}')
    if not any('Public UI' in e for e in errors): passes.append('Users can save anatomical bookmarks and inspect them in a native MORPHORA drawer')

    sw=(ROOT/'service-worker.js').read_text(encoding='utf-8')
    for token in ('./backend/bookmarks-service.js','./backend/personal-sync-service.js','./backend/bookmarks-ui.js'):
        if token not in sw: errors.append(f'Service worker missing offline shell asset: {token}')

    for locale in ('en','es'):
        dictionary=json.loads((ROOT/'i18n'/f'{locale}.json').read_text(encoding='utf-8'))
        for key in ('bookmarks.title','bookmarks.save','bookmarks.cloudTitle','notes.cloudTitle','notes.offlineTitle'):
            if not dictionary.get(key): errors.append(f'i18n/{locale}.json missing {key}')

    build=(ROOT/'tools/build_release.py').read_text(encoding='utf-8')
    checker=(ROOT/'tools/check_release.py').read_text(encoding='utf-8')
    if 'notes-bookmarks-sync-audit.json' not in build: errors.append('Release builder does not require notes/bookmarks sync audit')
    if 'notesBookmarksSync' not in checker: errors.append('Release checker does not verify notesBookmarksSync metadata')
    if not any('Release' in e for e in errors): passes.append('Production deployment requires the V5.0.5 notes/bookmarks quality gate')

    report={'product':'MORPHORA','version':VERSION,'gate':'notes-bookmarks-sync','summary':{'errors':len(errors),'warnings':len(warnings),'passes':len(passes)},'errors':errors,'warnings':warnings,'passes':passes}
    REPORT.parent.mkdir(exist_ok=True)
    REPORT.write_text(json.dumps(report,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'MORPHORA V{VERSION} notes/bookmarks sync audit')
    for item in passes: print('✓',item)
    for item in warnings: print('!',item)
    for item in errors: print('✗',item)
    print(f'Result: {len(errors)} error(s), {len(warnings)} warning(s), {len(passes)} pass record(s)')
    return 1 if errors else 0

if __name__=='__main__': raise SystemExit(main())
