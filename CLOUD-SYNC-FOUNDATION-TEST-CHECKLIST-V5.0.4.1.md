# MORPHORA V5.0.4.1 — Cloud Sync Foundation Test Checklist

- [ ] Run `202610050001_v5_cloud_sync_foundation.sql` successfully in Supabase SQL Editor.
- [ ] Confirm `user_documents` has `deleted_at`, `last_mutation_id`, and `last_client_id`.
- [ ] Confirm RLS remains enabled on `user_documents`.
- [ ] Sign in as Test User A and open Developer Diagnostics.
- [ ] Confirm Cloud sync foundation reports Ready with zero pending items.
- [ ] Turn the browser offline and confirm diagnostics reports Offline without breaking the atlas.
- [ ] Return online and confirm the atlas/account experience remains normal.
- [ ] Sign out and sign in as Test User B; confirm no User A queue items appear in User B totals.
- [ ] Run `npm run ci` before deployment.
- [ ] Confirm the production artifact records `cloudSyncFoundation: passed` in `release.json`.

Note: this version does not automatically upload notes, drawings, Study progress, Quiz history, or bookmarks. That behavior begins in later V5.0.4 sub-releases.
