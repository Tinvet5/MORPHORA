# MORPHORA Histology Library v0.7

## Cloud Sync & Account Integration

Built on the stable Histology Library v0.6 Study & Quiz baseline.

### What changed

- Histology student workspaces now sync through the existing MORPHORA V5 cloud queue and Supabase `user_documents` backend when a user is signed in.
- Synced Histology workspace data includes:
  - slide notes
  - personal point labels
  - personal polygon/color zones
  - slide-anchored drawings
  - slide bookmarks
  - Study status (`Known` / `Learning`)
  - Quiz and Locate history
  - per-slide learning progress
- Histology remains **local-first**:
  - every edit is saved to the browser immediately
  - offline edits remain usable
  - sync resumes when connectivity returns
- Histology cloud records are namespaced as `histology:<slide-id>:workspace` so they cannot collide with Anatomy annotation records.
- Anatomy personal sync explicitly ignores Histology workspace documents.
- Revision-aware cloud writes use the existing V5 conflict queue.
- Sync Center can resolve Histology conflicts with:
  - **Keep this device**
  - **Use cloud version**
- Added Histology cloud-state indicators to both the Histology library and slide viewer:
  - Guest · Local
  - Cloud synced
  - Syncing
  - Offline · saved locally
  - Sync needs attention
- Clicking the cloud indicator triggers a Histology sync for signed-in users.
- Guest Histology work is safely adopted into a first signed-in account; user-to-user adoption is not performed.
- Histology workspaces are included in MORPHORA recovery/backup snapshots.
- Existing v0.6 local workspaces migrate forward to workspace schema version 4 without losing notes, labels, drawings, bookmarks, or learning history.

### Backend impact

No new SQL migration is required for v0.7. Histology reuses the existing V5 `user_documents` sync model and `annotations` document type with a Histology-specific namespaced document key.

### Account behavior

- Guest: Histology remains local-only.
- Signed in + online: local-first changes are queued and synchronized.
- Signed in + offline: changes remain local and queue for later sync.
- Account switching: Histology workspace keys remain principal-scoped; one signed-in user's local Histology data is never adopted into another signed-in account.

### Current scope

Whole-slide image delivery is still local through PMA.start. Cloud sync in v0.7 synchronizes **user learning data**, not the gigapixel source slides themselves. Hosted WSI delivery remains the next major production milestone.
