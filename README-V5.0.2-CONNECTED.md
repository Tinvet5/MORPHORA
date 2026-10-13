# MORPHORA V5.0.2 — Connected Authentication Build

This build connects the V5.0.2 authentication interface to the MORPHORA Supabase project. Email/password account creation, sign-in, session restore, email confirmation redirects, password reset redirects, and sign-out can now use the live Supabase backend after the Supabase Authentication URL allow-list is configured.

## Included configuration

- Supabase backend: **enabled**
- Project URL: configured
- Browser key: **publishable key only**
- Production auth redirect: `https://morphora.cl/`
- Google OAuth: **disabled** until a Google provider is configured
- Existing notes, drawings, quiz history, and study progress: **still local-only**

## VS Code Live Server

MORPHORA detects `127.0.0.1`, `localhost`, and `::1`. During local development, auth flows return to the exact current local origin, port and pathname instead of redirecting to production.

Add these to **Supabase → Authentication → URL Configuration → Redirect URLs**:

- `https://morphora.cl/**`
- `http://127.0.0.1:5500/**`
- `http://localhost:5500/**`

If Live Server uses a different port, add the same pattern with that port.

## Security

No Supabase secret/service-role credential is included. Never add `sb_secret_...`, `service_role`, or the database password to browser code or the repository. Authorization remains enforced through the RLS policies installed by the V5.0.1/V5.0.2 migrations.
