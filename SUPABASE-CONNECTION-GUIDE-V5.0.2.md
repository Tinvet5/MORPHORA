# MORPHORA V5.0.2 — Supabase connection

This source build is connected to the MORPHORA Supabase project using the browser-safe publishable key. No secret/service-role key is present.

## Supabase Authentication URL configuration

In **Supabase → Authentication → URL Configuration** configure:

- **Site URL:** `https://morphora.cl/`
- **Redirect URL:** `https://morphora.cl/**`
- **Redirect URL (VS Code Live Server):** `http://127.0.0.1:5500/**`
- **Redirect URL (alternate Live Server hostname):** `http://localhost:5500/**`

The MORPHORA auth runtime detects `localhost`, `127.0.0.1`, and `::1` and returns to the exact local origin, port, and pathname that launched the auth flow. Therefore a custom Live Server port still works after that origin is added to the Supabase redirect allow-list.

## Public browser configuration

- Backend: enabled
- Provider: Supabase
- Production redirect: `https://morphora.cl/`
- Google OAuth: disabled until its provider is configured

## Security boundary

The `sb_publishable_...` key is intentionally public and may ship in browser code. **Never** place `sb_secret_...`, `service_role`, database passwords, or other privileged credentials in MORPHORA frontend files. Row Level Security remains the authorization boundary for user-owned data.

## V5.0.4.1 additional migration

For MORPHORA V5.0.4.1 and later, also run `database/migrations/202610050001_v5_cloud_sync_foundation.sql` after the original V5.0.1/V5.0.2 migrations. It adds revision-aware sync metadata and deletion tombstones. No secret/service-role key is required in the browser.
