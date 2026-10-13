# MORPHORA V5.0.4.5 — Sync Conflict / Retry UX & Visibility Polish

## Purpose
V5.0.4.5 makes MORPHORA's cloud synchronization understandable and recoverable for end users without changing the local-first learning workflow.

## New Sync Center
Signed-in users now have a Sync Center inside Account settings with:
- Synced / Syncing / Offline / Needs attention states
- Pending, conflict and failed mutation counts
- Last completed sync time
- Manual **Sync now**
- Expandable activity review
- Retry controls for failed operations
- Explicit conflict choices: **Keep this device** or **Use cloud version**

## Conflict semantics
- **Keep this device** updates the queued mutation to use the latest cloud revision, then retries it.
- **Use cloud version** applies the remote document to the relevant local store first, updates revision metadata, and then discards the stale local mutation.
- Supported conflict types: personal notes, bookmarks, drawings, Study progress and Quiz history.

## Offline behavior
No user action is required while offline. MORPHORA continues saving locally and the Sync Center reports that pending work is safe on the device until connectivity returns.

## Database
No new Supabase migration is required. This release uses the existing `user_documents` schema and V5.0.4.1 revision/tombstone infrastructure.
