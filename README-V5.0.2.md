# MORPHORA V5.0.2 — Authentication & Account Entry

V5.0.2 is the first visible account milestone built on V5.0.1. The atlas remains local-first and fully usable as a guest. When Supabase is configured, the same build supports email/password account creation, sign-in, persistent browser sessions, password recovery/update, sign-out, and a Google OAuth hook that can be enabled after provider setup.

## Safe defaults

- Backend remains disabled in source (`enabled: false`) until the real MORPHORA Supabase project is configured.
- Only a Supabase publishable browser key may be placed in `backend-config.js`.
- Google sign-in remains disabled (`googleEnabled: false`) until Google OAuth is configured in Supabase/Google.
- Guest/local mode continues to use the existing V4 persistence layer. V5.0.2 does not upload notes, drawings, quiz history or learning progress.
- Passwords are submitted directly to Supabase Auth through the browser SDK and are never written to MORPHORA local storage.

## Supabase setup order

1. Create the MORPHORA Supabase project.
2. Apply `database/migrations/202610040001_v5_backend_foundation.sql`.
3. Apply `database/migrations/202610040002_v5_authentication.sql`.
4. In Supabase Auth settings, configure the production Site URL and allowed redirect URLs for `https://morphora.cl/` (and local development URLs while testing).
5. Copy only the Project URL and `sb_publishable_...` browser key into `backend-config.js`; set `enabled: true`.
6. Test email confirmation, sign-in, session restoration, password recovery, sign-out, and RLS with at least two separate test users.
7. Configure Google OAuth separately, then set `googleEnabled: true` only after it succeeds in the Supabase test environment.

## V5 boundaries

Cloud synchronization of study data is deliberately deferred to V5.0.4. Profiles/preferences receive only the minimal account rows required for identity groundwork. Payment/billing is not part of V5.0.2.
