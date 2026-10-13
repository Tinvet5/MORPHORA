# MORPHORA V5.0.4.3 — Drawing Sync + Personal Library Visual Polish

## What changed
- Drawings now participate in MORPHORA cloud sync using the existing user_documents backend.
- Drawings remain local-first and continue working offline. When a user signs in, per-view drawings are captured and synchronized in the background.
- Remote drawing changes restore into the local drawing store and refresh the atlas canvas without changing the drawing tool workflow.
- The Personal Library / Bookmarks drawer received a richer card-based layout with improved hierarchy and action buttons.

## Sync behavior
- Document type: `drawings`
- Document key: active `viewId`
- Payload: `{ viewId, strokes, updatedAt }`
- Deletes propagate when a view no longer contains strokes.

## Notes
- No Supabase schema change is required if `user_documents` already exists from V5.0.4.1 / V5.0.4.2.
- Learning progress remains local in this release.
