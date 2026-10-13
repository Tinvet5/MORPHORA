# MORPHORA V5.0.4.3 — Interaction Hotfix

This hotfix restores reliable initialization of Study, Quiz, Learning Progress and Drawing controls after the V5.0.4.2 notes/bookmarks release.

## Fixes
- Study/Quiz and Drawing initialize from the explicit `morphora:atlas-ready` lifecycle instead of racing `DOMContentLoaded`.
- Optional V5 bookmark/sync DOM elements can no longer abort the core atlas runtime during temporary mixed-cache states.
- VS Code Live Server (`localhost`, `127.0.0.1`, `::1`) automatically unregisters MORPHORA service workers and clears MORPHORA caches so local testing always runs the files on disk.
- Production service worker treats JS/CSS as release-coherent network-first assets with exact cache matching.
- Notes/bookmarks cloud-sync behavior is retained unchanged.
