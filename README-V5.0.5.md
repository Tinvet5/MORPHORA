# MORPHORA V5.0.5 — Final Migration, Offline Recovery & Security Hardening

V5.0.5 closes the V5 account/cloud foundation without adding a new learning feature. It hardens the behavior already introduced across V5.0.1–V5.0.4.5.

## Account-scoped local vault
- Notes, bookmarks, drawings, learning progress, and the device-local active quiz session are separated by account on the same browser.
- Signing out restores the guest workspace instead of leaving the signed-in user's local study data visible.
- Switching from User A to User B saves A's workspace before restoring B's.
- Guest study data may be adopted when a guest signs into a first-time account, preserving MORPHORA's local-first workflow.
- User-to-user switches never adopt the outgoing user's workspace.

## Migration safety
- The first V5.0.5 run preserves the currently authenticated workspace in a versioned local vault.
- A recovery point is created before the local-vault migration.
- Account switches create account-scoped recovery points before replacing browser-local stores.
- Existing V5 storage schemas remain compatible; no Supabase migration is required.

## Local recovery
- The Account panel includes a Local recovery card.
- Users can create a recovery point manually.
- The latest recovery point can be restored only for the same local account principal.
- Recovery restore reloads MORPHORA so all in-memory modules hydrate from the restored stores.

## Offline hardening
- The service worker uses release-specific cache namespaces.
- Offline navigation falls back to the matching MORPHORA surface (`index`, Studio, Diagnostics, or Performance Lab) instead of always returning the atlas home page.
- Runtime/data/tile caches remain bounded.
- Explicit service-worker messages support safe activation and runtime-cache clearing.

## Security hardening
- Browser backend configuration remains limited to the Supabase publishable key and HTTPS project URL.
- Privileged `sb_secret_*` / service-role credentials are forbidden by the final release audit.
- Existing forced RLS/auth.uid database ownership checks remain part of the production gate.
- Referrer policy is set to `strict-origin-when-cross-origin` on runtime surfaces.
- V5.0.5 production builds require the final hardening gate in addition to all earlier V5 gates.

## Database
No new SQL migration is required for V5.0.5.
