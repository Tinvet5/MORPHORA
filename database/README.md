# MORPHORA V5.0.2 database foundation

`migrations/202610040001_v5_backend_foundation.sql` creates the account-scoped tables and RLS foundation. `migrations/202610040002_v5_authentication.sql` adds automatic minimal profile/preferences provisioning when Supabase Auth creates a user. `schema.sql` is the combined snapshot.

The migration creates three authenticated-user tables:

- `profiles` — minimal public-facing profile metadata owned by the user.
- `user_preferences` — language/theme preferences.
- `user_documents` — flexible account-scoped JSON documents for annotations, drawings, learning progress, quiz history and bookmarks.

Every exposed table has Row Level Security enabled and forced. Browser roles receive no anonymous table access; authenticated users receive CRUD grants, then operation-specific RLS policies restrict every row to `auth.uid() = user_id`.

## Supabase setup

1. Create the MORPHORA Supabase project.
2. Apply the migration with the Supabase SQL editor or CLI.
3. In Project Settings → API Keys, copy the **publishable** browser key (`sb_publishable_…`) and project URL.
4. Put only those two public values in `backend-config.js`, then change `enabled` to `true`.
5. Never put a secret key, legacy `service_role` key, database password, Stripe secret, or any other privileged credential in browser files.

V5.0.2 includes the public account-entry UI. With the backend disabled—or if the cloud SDK cannot load—the atlas continues in local-only guest mode and no auth request is attempted.

## V5.0.4.1 cloud sync migration

After the V5.0.1 and V5.0.2 migrations, run:

`migrations/202610050001_v5_cloud_sync_foundation.sql`

This adds sync tombstones, mutation identity, client identity, and pull indexes to `user_documents` while retaining per-user RLS.
