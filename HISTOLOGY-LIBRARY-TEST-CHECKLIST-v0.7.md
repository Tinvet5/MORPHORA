# Histology Library v0.7 Test Checklist

## Signed-out / local-first
- Open Histology while signed out.
- Confirm the cloud chip says **Guest · Local**.
- Create a note, personal label, drawing, bookmark, Study result and Quiz result.
- Reload the slide and confirm all data persists locally.

## Guest → account adoption
- Create Histology work as Guest.
- Sign in to a MORPHORA account from the main app.
- Return to the same Histology slide.
- Confirm the guest workspace is preserved in that first account.
- Confirm the cloud chip progresses from Syncing to Cloud synced when online.

## Cross-device / browser sync
- While signed in, change a note or create a personal label on one browser/device.
- Trigger sync from the Histology cloud chip or main Sync Center.
- Open the same account and slide on another browser/device.
- Confirm the note/label appears after sync.
- Repeat with drawing, bookmark, Study status and Quiz history.

## Offline recovery
- Sign in, then disable network access.
- Confirm the cloud chip says **Offline · saved locally**.
- Edit a Histology workspace.
- Restore connectivity and confirm queued work syncs automatically.

## Conflict handling
- Create conflicting edits to the same slide workspace on two devices.
- Confirm Sync Center surfaces a Histology conflict.
- Test **Keep this device** and confirm the local workspace wins.
- Create another conflict and test **Use cloud version**; confirm the remote Histology workspace is applied locally.

## Account isolation
- Use User A to create labels/notes on a slide.
- Sign out, verify Guest does not inherit User A data.
- Sign in as User B, verify User A data is not adopted.
- Return to User A and verify User A's Histology workspace is restored.

## Recovery snapshots
- Create Histology notes/labels.
- Create a MORPHORA recovery point.
- Confirm the backup bundle includes Histology workspaces for the current principal.

## Regression
- All six Histology slides still load through PMA.start.
- Drawing remains slide-anchored.
- My Labels color coding still works.
- Histology Studio official authoring/export still works.
- Study, Multiple Choice and Locate modes still work.
- Anatomy sync behavior remains unchanged.
