# MORPHORA V4.9.5 — Storage Abstraction & Persistence Hardening

V4.9.5 is a persistence architecture release built directly on V4.9.4. It keeps the visual system, atlas schemas, Deep Zoom content, Study/Quiz behavior, Studio publishing workflow, notes, drawings and deployment pipeline intact while replacing fragmented browser-storage access with one shared persistence layer.

## Main changes

### Shared `storage.js`

A new root-level `storage.js` module is now the authoritative browser persistence layer for:

- personal annotations / notes
- drawings
- learning progress
- theme preference
- recent atlas route
- Studio last context
- Studio JSON drafts
- Studio local collection drafts
- session-only UI state
- performance history

Studio-uploaded photograph blobs remain in the specialized IndexedDB `studio/storage.js` module because binary image storage has different requirements from JSON/preferences.

### Existing data remains compatible

No manual migration is required. The storage layer still recognizes the existing V1/V2 keys and uses the V4.8.4 user-data migration helpers. Legacy copies are preserved rather than deleted.

### Corrupt-data recovery

Malformed persisted JSON is no longer silently discarded. MORPHORA captures a bounded recovery snapshot before clearing the unusable current value and attempting legacy/fallback recovery. Up to three recovery snapshots are retained per source key.

### Quota and blocked-storage fallback

If browser persistence is unavailable or full, writes fall back to an in-memory session copy where practical. Notes, drawings and learning-progress tools tell the user when content is available for the current session but could not be committed permanently. Studio reports `Storage full · session copy active` rather than claiming a successful autosave.

### Unified personal-data backup

Developer Diagnostics can now export one MORPHORA personal-data bundle containing:

- notes
- drawings
- learning progress
- theme preference
- recent atlas route
- Studio last-context preference

It can also restore that bundle. Before a unified restore, MORPHORA attempts to create an automatic pre-import recovery snapshot.

The existing feature-specific backups remain valid. Notes, drawings and Study imports also understand the corresponding data inside the new unified bundle.

### Storage diagnostics

`dev-tools.html` now includes Storage Health:

- browser storage availability
- browser quota usage
- persistent-storage permission state
- recovery snapshot count
- session-memory fallback state
- request-persistence control
- export/import personal backup controls

Persistent-storage permission is browser-controlled and best-effort; it is not a substitute for backups.

## New developer command

```bash
npm run check:storage
```

The full validation command now includes storage-abstraction tests:

```bash
npm run check
```

## Files added or materially changed

- `storage.js` — shared persistence abstraction
- `tools/test_storage.js` — migration/recovery/quota/backup tests
- `script.js` — annotations use shared persistence
- `drawing.js` — drawing store uses shared persistence
- `study.js` — learning progress uses shared persistence
- `navigation.js` — theme/recent-route/session UI preferences use shared persistence
- `performance.js` — local performance history uses shared persistence
- `studio/studio.js` — Studio draft/context/preferences use shared persistence
- `dev-tools.html`, `dev-tools.js`, `dev-tools.css` — storage diagnostics and unified backup tools
- `service-worker.js` — caches `storage.js` in the application shell
- `tools/build_release.py` — includes `storage.js` in deployment artifacts
- `tools/audit_performance.py` — counts `storage.js` in the core shell budget

## What V4.9.5 does not add

- user accounts
- cloud synchronization
- remote databases
- server-side backups
- collaboration

All personal data remains local to the browser/device unless the user exports a backup.

## Local testing

Use Live Server and test:

```text
http://127.0.0.1:5500/
http://127.0.0.1:5500/studio.html
http://127.0.0.1:5500/dev-tools.html
```

Recommended smoke test:

1. Confirm existing notes, drawings and Study progress appear.
2. Add a note, drawing and quiz attempt; refresh and confirm they persist.
3. Open Developer Diagnostics and inspect Storage Health.
4. Export a personal-data backup.
5. Export the separate notes/drawing/progress backups and confirm they still work.
6. Create/edit a Studio draft, refresh Studio and confirm draft recovery.
7. Run `npm run check`.
8. Run `npm run release:verify`.

## Validation result

The packaged V4.9.5 source passed the full validation pipeline with zero errors and the existing expected warning for the intentionally absent `dog-cervical-c1-dorsal` source photograph.

The release artifact also passed deployment validation. Deep Zoom remains healthy at 2,605 tiles / 6.97 MiB with zero static performance warnings.
