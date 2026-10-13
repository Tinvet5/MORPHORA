# MORPHORA V5.0.5 — Final Hardening Test Checklist

## Migration
- Upgrade a browser containing V5.0.4.5 local study data while signed in.
- Confirm the notes, bookmarks, drawings, progress, and active quiz remain available after V5.0.5 loads.
- Confirm a local recovery point is created.

## Account isolation
- Sign in as User A and create a note/bookmark/drawing/progress item.
- Sign out and confirm guest mode does not display User A data.
- Add a guest bookmark and sign into a new User B account; confirm guest data is adopted.
- Switch directly from User B to User A and confirm B's local data does not appear in A's workspace.
- Switch back to User B and confirm B's workspace restores.

## Recovery
- Open Account → Local recovery.
- Create a recovery point and confirm the count increases.
- Change local study data.
- Restore the latest recovery point and confirm MORPHORA reloads with the recovered workspace.

## Offline
- Open Atlas, Studio, Developer Diagnostics, and Performance Lab online once.
- Disconnect network access and revisit each previously opened route.
- Confirm each route falls back to its own cached shell rather than redirecting to the atlas home page.
- Create local study changes offline, reconnect, and confirm the existing Sync Center resumes cloud synchronization.

## Security
- Confirm browser source contains only the `sb_publishable_...` Supabase key.
- Confirm switching accounts does not expose another account's local workspace.
- Confirm production release metadata reports `finalHardening: passed`.
