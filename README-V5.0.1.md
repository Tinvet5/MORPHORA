# MORPHORA V5.0.1 — Backend Foundation

V5.0.1 begins the V5 platform architecture without changing the public atlas experience. V4.9.8 remains the behavioral baseline: Explore, Study, Quiz, notes, drawings, localization, Studio and offline/local persistence continue to work for guests exactly as before.

## What changed

### Local-first backend abstraction
A new browser-safe backend layer lives under `backend/`:

- `supabase-loader.js` — loads the pinned Supabase browser SDK only when cloud mode is explicitly configured.
- `backend-client.js` — exposes backend status and fails safely back to local mode.
- `auth-service.js` — account/auth API surface for V5.0.2.
- `profile-service.js` — minimal profile and preference repository.
- `sync-service.js` — account-scoped document operations for future cloud synchronization.
- `data-service.js` — local-first storage facade that keeps browser persistence authoritative.

No existing Study/Quiz/annotation code has been forced onto the cloud layer yet. That migration is intentionally staged for later V5 builds.

### Safe configuration
`backend-config.js` ships with:

- `enabled: false`
- an empty project URL
- an empty publishable key
- Supabase JS pinned to `2.117.2`

Therefore deploying this source as-is does not create an account system, contact Supabase, or upload personal data. When MORPHORA is ready to connect a Supabase project, only the public project URL and `sb_publishable_…` key belong in this file.

Never place `sb_secret_…`, legacy `service_role`, database passwords, Stripe secrets, or any other privileged credential in frontend files.

### Database foundation
`database/migrations/202610040001_v5_backend_foundation.sql` creates:

- `profiles`
- `user_preferences`
- `user_documents`

All three tables enable and force Row Level Security. Anonymous browser access receives no table grants. Authenticated CRUD operations are restricted by separate SELECT/INSERT/UPDATE/DELETE policies to rows whose `user_id` equals `auth.uid()`.

`user_documents` deliberately stores flexible JSON payloads during the first sync era. This lets MORPHORA migrate the existing annotation, drawing and progress stores without prematurely locking the project into a highly normalized analytics schema.

### Developer diagnostics
`dev-tools.html` now includes a **Backend readiness** card showing:

- local-only / cloud-ready / fallback state
- provider
- pinned SDK version
- configured project hostname

The publishable key is never displayed.

### Release gates
V5.0.1 adds `npm run check:backend` and `npm run check:backend-runtime`.

The backend gate checks disabled-by-default configuration, SDK pinning, RLS/grant policies, runtime module inclusion, offline shell coverage, and production-build boundaries. The release builder now refuses a normal validated build unless project validation, the release-candidate audit and the backend-foundation audit all pass.

The `database/` folder and development reports remain excluded from production deployment artifacts.

## Connecting the first Supabase project

1. Create a Supabase project owned by MORPHORA.
2. Apply `database/migrations/202610040001_v5_backend_foundation.sql` in the SQL editor or through migrations.
3. Obtain the project URL and **publishable** API key from Supabase Project Settings → API Keys.
4. Edit `backend-config.js`:
   - set `projectUrl`
   - set `publishableKey`
   - change `enabled` to `true`
5. Open Developer Diagnostics. Backend readiness should change from `local-only / Local safe` to `cloud-ready / Cloud ready`.
6. Re-run `npm run ci` before deployment.

V5.0.1 has no public login/create-account UI by design. That is the next milestone: **V5.0.2 — Authentication UI & Account Lifecycle**.
