# MORPHORA V5.0.4.2 — Notes & Bookmarks Cloud Sync

V5.0.4.2 is the first MORPHORA release to synchronize real study data between devices. Personal notes and anatomical structure bookmarks remain local-first, but signed-in users can now carry them with their MORPHORA account.

## What changed

- Existing personal notes are synchronized as individual cloud documents instead of one large account blob.
- Added anatomical structure bookmarks/favorites to the structure information panel.
- Added a dedicated **My bookmarks** drawer to the personal workspace.
- Notes and bookmarks save locally first, then enter the durable account-scoped sync queue from V5.0.4.1.
- Offline note/bookmark changes remain usable and are retried when connectivity returns.
- Existing local notes are adopted into the signed-in account without duplicating them on repeated syncs.
- Newer cloud copies are merged back into the local MORPHORA stores on other devices.
- Revision checks detect concurrent edits instead of silently overwriting another device.
- Tombstones propagate bookmark/note deletion without allowing an older device to resurrect deleted data.
- Pending mutations remain bound to the account that created them, preventing cross-account queue leakage on shared browsers.
- Notes display local/syncing/synced/offline/conflict state.
- Bookmarks display equivalent local/cloud sync state.
- Backup/export support now includes bookmarks.
- Production release verification includes a dedicated V5.0.4.2 notes/bookmarks sync gate.

## Supabase migration

**No new SQL migration is required for V5.0.4.2.**

This release uses the `user_documents` table and sync metadata already installed by:

`database/migrations/202610050001_v5_cloud_sync_foundation.sql`

If that V5.0.4.1 migration has already been run successfully, the Supabase project is ready for this release.

## Data boundary

Synchronized in V5.0.4.2:

- Personal notes
- Structure bookmarks

Still local-only:

- Drawings
- Study progress
- Quiz history/progress

Those data types remain deliberately outside this iteration and will be moved onto the sync layer in later V5.0.4 releases.

## Guest behavior

Accounts remain optional. Guests continue to use notes and bookmarks locally on the current browser/device. Cloud synchronization is attempted only for an authenticated MORPHORA account.

## Conflict behavior

The sync engine records concurrent-edit conflicts rather than silently choosing a winner. V5.0.4.2 preserves the local data and exposes sync/conflict status; the richer user-facing conflict-resolution workflow remains planned for V5.0.4.5.

## Recommended cross-device test

1. Sign into the same MORPHORA account on Browser/Device A.
2. Add a personal note to an atlas view.
3. Bookmark an anatomical structure from its information panel.
4. Wait for the interface to report the data as synced.
5. Sign into the same account on Browser/Device B (or another browser profile).
6. Confirm the note and bookmark appear.
7. Edit the note on one device and confirm the newer version reaches the other.
8. Remove the bookmark and confirm it remains deleted after the second device synchronizes.
9. Repeat one change while offline, reconnect, and confirm it eventually synchronizes.

## Validation

Run the complete project validation with:

```bash
npm run check
npm run release:verify
```

Dedicated V5.0.4.2 gates:

```bash
npm run check:personal-sync-runtime
npm run check:notes-bookmarks
```
