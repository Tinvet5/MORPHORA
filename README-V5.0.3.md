# MORPHORA V5.0.3 — Profiles & Cloud Preferences

V5.0.3 builds on the connected V5.0.2 authentication release. It gives a signed-in MORPHORA account an editable profile and synchronizes interface preferences without moving study data to the cloud yet.

## User-facing changes

- Editable display name stored in `public.profiles`.
- Cloud-synced language (`es` / `en`).
- Cloud-synced theme preference (`system` / `dark` / `light`).
- Account metadata for member-since date and sign-in method.
- Signed-in account panel redesigned into Profile, Preferences, and Account details sections.
- Header initials immediately follow the saved profile name.
- Preference status badge communicates local, syncing, synced, or error state.

## Preference behavior

MORPHORA remains local-first. Guest users keep local language/theme behavior. Signed-in users hydrate interface preferences from `public.user_preferences`; subsequent language-menu and theme-toggle changes are synchronized back to that account.

For accounts originally provisioned by V5.0.2, an untouched cloud `theme=system` value is allowed to adopt an existing explicit local light/dark choice once. This avoids unexpectedly changing a long-standing device preference during the upgrade.

## Data boundary

V5.0.3 does **not** upload annotations, drawings, quiz history, bookmarks, or learning progress. Those remain local until the dedicated V5.0.4 cloud-sync milestone.

## Database

No new SQL migration is required for V5.0.3. The `profiles` and `user_preferences` tables and RLS policies were already created by V5.0.1 and provisioned by V5.0.2.

## Security

- Browser code continues to use only the Supabase publishable key.
- Profile/preferences rows remain restricted by the existing `auth.uid() = user_id` RLS policies.
- Profile updates are partial: changing a display name does not clear unrelated fields such as a future OAuth avatar.
- No privileged/service-role credential is present in the frontend.

## Validation

Run:

```bash
npm run check
npm run release:verify
```

V5.0.3 adds `check:preferences-runtime` and `check:preferences`. A production artifact is blocked unless the profile/preferences audit passes alongside the backend, authentication, and release-candidate gates.
