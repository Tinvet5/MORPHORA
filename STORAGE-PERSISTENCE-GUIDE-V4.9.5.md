# MORPHORA V4.9.5 Storage & Persistence Guide

## Storage families

### Personal study data

| Store | Current key | Legacy key |
|---|---|---|
| Notes | `morphora:annotations:v2` | `morphora:annotations:v1` |
| Drawings | `morphora:drawings:v2` | `morphora:drawings:v1` |
| Learning progress | `morphora:learning-progress:v2` | `morphora:learning-progress:v1` |

These stores are accessed through `window.MorphoraStorage.readStore()` and `writeStore()`.

### Preferences and recent state

Examples include:

- `morphora:theme`
- `morphora:last-atlas-route`
- `morphora:studio:last-context`
- Studio draft prefixes
- session-only drawer/advisory state

These use the generic text/JSON APIs.

### Studio image blobs

Newly uploaded Studio photographs are still stored in IndexedDB by `studio/storage.js`. This is intentional: large binary blobs should not be serialized into Local Storage.

## Recovery model

When stored JSON cannot be parsed or migrated, `storage.js`:

1. captures the raw value in a `morphora:recovery:*` snapshot;
2. removes the unusable active key;
3. attempts the registered legacy key when one exists;
4. otherwise returns the caller's safe fallback.

Only the three newest recovery snapshots per original key are retained.

## Storage pressure model

A failed persistent write can occur because storage is blocked, unavailable or at quota. The storage API returns a result describing whether the write was persistent or only retained in the in-memory session fallback.

The session fallback prevents immediate data loss while the tab remains active, but it does **not** survive closing the browser. Export a backup or free browser storage before leaving the session.

## Unified backup format

`MorphoraStorage.createBackup()` creates:

```json
{
  "product": "MORPHORA",
  "kind": "personal-data-bundle",
  "backupVersion": 1,
  "userDataSchemaVersion": 2,
  "exportedAt": "...",
  "stores": {
    "annotations": {},
    "drawings": {},
    "learningProgress": {}
  },
  "preferences": {
    "theme": "dark",
    "lastAtlasRoute": "#/...",
    "studioLastContext": {}
  }
}
```

Studio draft JSON can be included programmatically, but Developer Diagnostics excludes it by default because Studio content is developer state rather than student study data.

## Future backend migration

The main purpose of V4.9.5 is architectural. Features now depend on a shared persistence interface rather than directly depending on Local Storage. V5.0 can introduce a cloud-backed adapter while preserving the feature-level data models and most of the caller logic.
