# MORPHORA V4.9.5 Persistence Test Checklist

## Existing-data compatibility

- [ ] Existing V4.9.4 notes are visible after upgrade.
- [ ] Existing drawings are visible after upgrade.
- [ ] Existing learning progress is visible after upgrade.
- [ ] Existing theme preference is preserved.
- [ ] Continue/recent atlas route still points to the previous view.
- [ ] Existing Studio drafts can be restored.

## Normal persistence

- [ ] Create a note and refresh; note remains.
- [ ] Move/edit/recolor note and refresh; changes remain.
- [ ] Draw a stroke and refresh; stroke remains.
- [ ] Complete a Study/Quiz action and refresh; progress remains.
- [ ] Change theme and refresh; theme remains.
- [ ] Open another anatomical view and confirm recent-route behavior.
- [ ] Save a Studio draft and refresh Studio; draft remains.

## Developer Diagnostics

Open `dev-tools.html`.

- [ ] Storage Health reports browser storage available.
- [ ] Browser quota displays when the browser exposes an estimate.
- [ ] Persistence permission reports Granted / Best effort / Unknown.
- [ ] Recovery snapshot count renders.
- [ ] Request persistence does not break the page if the browser declines.

## Backup compatibility

- [ ] Export personal-data bundle.
- [ ] Bundle includes annotations, drawings and learningProgress stores.
- [ ] Bundle includes theme/recent preferences.
- [ ] Importing a unified bundle restores the data.
- [ ] A pre-import recovery snapshot is created when possible.
- [ ] Legacy Notes export/import still works.
- [ ] Legacy Drawing export/import still works.
- [ ] Legacy Learning Progress export/import still works.
- [ ] Feature-specific import accepts the matching store from a unified bundle.

## Storage pressure / failure behavior

Where browser dev tools or a test environment allows it:

- [ ] Block Local Storage and confirm the app does not crash.
- [ ] A failed notes write reports a session-only warning.
- [ ] A failed drawing write reports a session-only warning.
- [ ] A failed progress write reports a session-only warning.
- [ ] Studio reports `Storage full · session copy active` when a draft falls back to memory.
- [ ] Current-session data remains readable from the fallback.

## Corrupt-data recovery

- [ ] Invalid JSON is quarantined rather than crashing the feature.
- [ ] A valid legacy store can restore after a corrupt current store.
- [ ] Recovery snapshots are bounded rather than growing forever.

## Tooling

```bash
npm run check:storage
npm run check
npm run release:verify
```

Expected source validation baseline: 0 errors and 1 intentional missing-cervical-image warning.
