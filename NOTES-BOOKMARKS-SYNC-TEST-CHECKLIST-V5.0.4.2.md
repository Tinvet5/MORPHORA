# MORPHORA V5.0.4.2 — Notes & Bookmarks Sync Test Checklist

## Guest/local behavior

- [ ] Open MORPHORA signed out and create/edit/delete a note.
- [ ] Reload and confirm local notes persist.
- [ ] Bookmark and remove an anatomical structure while signed out.
- [ ] Reload and confirm bookmark state persists locally.
- [ ] Confirm guest actions do not require an account or network connection.

## Signed-in notes

- [ ] Sign in and create a note; confirm it saves immediately before cloud completion.
- [ ] Confirm note status advances from local/syncing to synced when online.
- [ ] Refresh and confirm the note remains present.
- [ ] Sign into the same account in a second browser/device and confirm the note appears.
- [ ] Edit the note on one device and confirm the newer cloud copy reaches the other device.
- [ ] Delete a note and confirm an older device does not resurrect it after syncing.

## Signed-in bookmarks

- [ ] Open a labeled anatomical structure and select **Save bookmark**.
- [ ] Confirm the control changes to **Bookmarked** and exposes pressed state accessibly.
- [ ] Open **My bookmarks** from the personal workspace and confirm the entry is listed.
- [ ] Sign into the same account in a second browser/device and confirm the bookmark appears.
- [ ] Open a bookmark and confirm MORPHORA navigates to the correct collection/view.
- [ ] Remove the bookmark and confirm the deletion propagates to another device.

## Offline/retry behavior

- [ ] While signed in, disconnect the network and add/edit a note.
- [ ] Confirm the change remains available locally.
- [ ] Add/remove a bookmark while offline.
- [ ] Reconnect and confirm queued mutations flush automatically.
- [ ] Refresh after reconnection and confirm no duplicate notes/bookmarks were created.

## Account isolation

- [ ] Queue a change for User A while offline, then sign out.
- [ ] Sign in as User B and confirm User A's pending data does not appear or flush under User B.
- [ ] Sign back in as User A and confirm the pending mutation can resume.

## Migration/idempotency

- [ ] With pre-existing local notes, sign into an account for the first time.
- [ ] Confirm existing notes are queued/adopted once.
- [ ] Reload/sign in again and confirm the same notes are not duplicated.

## Conflict safety

- [ ] Modify the same note independently on two devices before both synchronize.
- [ ] Confirm MORPHORA reports/retains a conflict rather than silently overwriting one version.
- [ ] Confirm normal non-conflicting items continue syncing while the conflict remains visible.

## Regression

- [ ] Explore mode labels/info panel still work.
- [ ] Study mode still works.
- [ ] Quiz mode still works.
- [ ] Drawing tools still work and remain local-only.
- [ ] Account/profile/language/theme sync still works.
- [ ] Studio still opens and behaves normally.
- [ ] Light/dark themes render bookmark/note UI correctly.
- [ ] Mobile/vertical layout remains usable.
