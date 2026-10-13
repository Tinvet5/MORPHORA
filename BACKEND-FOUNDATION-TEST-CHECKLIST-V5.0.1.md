# MORPHORA V5.0.1 — Backend Foundation Test Checklist

## Default/local-only release

- [ ] Open `index.html` without editing `backend-config.js`; the atlas loads normally.
- [ ] Explore, Study and Quiz continue to work.
- [ ] Existing notes, drawings and learning progress restore from browser storage.
- [ ] Browser Network tools show no Supabase SDK request while backend `enabled` is `false`.
- [ ] Developer Diagnostics shows **Backend readiness → Local safe** and `Project → Not configured`.
- [ ] Existing offline/service-worker behavior remains functional.

## Automated gates

- [ ] `npm run check:backend-runtime` passes.
- [ ] `npm run check:backend` reports 0 errors and 0 warnings.
- [ ] `npm run check:release-candidate` reports 0 errors.
- [ ] `npm run check` completes successfully.
- [ ] `npm run release:verify` builds and validates `dist/`.

## First Supabase test project

- [ ] Apply `database/migrations/202610040001_v5_backend_foundation.sql`.
- [ ] Confirm `profiles`, `user_preferences`, and `user_documents` have RLS enabled.
- [ ] Confirm the `anon` role has no CRUD grant on those tables.
- [ ] Configure only the project URL and `sb_publishable_…` key in `backend-config.js`.
- [ ] Set `enabled: true` and reload Developer Diagnostics.
- [ ] Backend readiness reports **Cloud ready**.
- [ ] No `sb_secret_…`, service-role key, database password, or billing secret exists anywhere in browser-delivered source.

## Regression boundary

- [ ] No login/register controls are visible yet; authentication UI belongs to V5.0.2.
- [ ] No guest data is automatically uploaded.
- [ ] No local data is deleted after backend configuration.
- [ ] A cloud initialization error leaves MORPHORA usable in `local-fallback` mode.
