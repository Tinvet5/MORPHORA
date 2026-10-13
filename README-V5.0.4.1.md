# MORPHORA V5.0.4.1 — Cloud Sync Foundation

V5.0.4.1 establishes the safe local-first synchronization substrate for future MORPHORA personal data. It does **not** yet automatically upload existing notes, drawings, study progress, quiz history, or bookmarks.

## What changed

- Durable account-scoped mutation queue (`backend/cloud-sync-engine.js`).
- Offline-safe retry with bounded exponential backoff.
- Revision-aware cloud writes and explicit conflict results.
- Idempotent mutation IDs so a retried request can be recognized after a lost response.
- Soft-delete tombstones (`deleted_at`) so deletions can propagate to other devices instead of being resurrected.
- Incremental cloud change-list primitive for future pull/merge releases.
- Stable per-browser client ID stored locally; it is an opaque sync identifier, not an auth credential.
- Developer Diagnostics shows pending/conflict/failed counts and can manually flush the current account queue.
- Production release now requires a dedicated V5.0.4.1 cloud-sync audit.

## Supabase migration required

Before a later V5.0.4 release begins syncing personal data, run this migration in the existing MORPHORA Supabase project after migrations 001 and 002:

`database/migrations/202610050001_v5_cloud_sync_foundation.sql`

The migration adds:

- `deleted_at`
- `last_mutation_id`
- `last_client_id`
- change/tombstone indexes
- re-asserted explicit authenticated grants and per-user RLS policies

The migration does not expose data to anonymous users and does not require a service-role key in the browser.

## Deliberate boundary

The existing personal stores remain local by default in this release. `backend/data-service.js` still uses `sync = false` unless a later feature explicitly opts a data type into cloud synchronization.

## Validation

Run:

```bash
npm run ci
```

The dedicated gates are:

```bash
npm run check:sync-runtime
npm run check:sync-foundation
```

