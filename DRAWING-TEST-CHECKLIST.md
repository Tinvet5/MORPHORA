# MORPHORA V4.8.2 — Drawing test checklist

## Core drawing
- [ ] Open a published anatomical view and enter **Draw on image**.
- [ ] Pen draws a continuous line with mouse input.
- [ ] Pen draws with a stylus/pencil where supported.
- [ ] One-finger touch produces a stroke on a touch device.
- [ ] Highlighter is visibly translucent and wider than Pen at the same size setting.
- [ ] Eraser removes the touched stroke rather than altering the anatomical image.
- [ ] Pan tool moves the OpenSeadragon viewport instead of drawing.
- [ ] Holding Space while dragging temporarily pans on desktop.
- [ ] Mouse wheel zoom continues to work.
- [ ] Pinch zoom does not commit an accidental partial stroke.

## Coordinate persistence
- [ ] Draw around a small anatomical landmark.
- [ ] Zoom in and confirm the sketch stays on the same anatomy.
- [ ] Pan away and back and confirm alignment.
- [ ] Reset view and confirm alignment.
- [ ] Resize the browser and confirm alignment.
- [ ] Switch to another view and confirm drawings do not leak between views.
- [ ] Return to the first view and confirm its drawing returns.
- [ ] Refresh the page and confirm drawings restore from local storage.

## History and editing
- [ ] Undo restores the previous stroke collection.
- [ ] Redo restores the undone change.
- [ ] Clear this view requires confirmation.
- [ ] Undo can restore a clear operation in the same browser session.
- [ ] Show/Hide changes visibility without deleting drawing data.

## Backup
- [ ] Export produces a valid MORPHORA drawing JSON file.
- [ ] Import/merge preserves current strokes and adds new unique strokes.
- [ ] Import/replace replaces the current drawing store.
- [ ] Invalid JSON displays an error without deleting existing drawings.

## Study/Quiz integration
- [ ] Starting Study while drawing exits drawing mode cleanly.
- [ ] Starting Quiz hides personal drawings.
- [ ] Drawing controls cannot reveal drawings during an active quiz.
- [ ] Ending Quiz restores the user's previous drawing visibility.

## Notes and labels
- [ ] Entering Draw mode hides official labels temporarily.
- [ ] Leaving Draw mode restores the previous label visibility state.
- [ ] Personal notes do not intercept drawing gestures while Draw mode is active.
- [ ] Existing personal notes remain unchanged after drawing.

## Mobile
- [ ] Drawing toolbar fits in portrait orientation.
- [ ] Drawing toolbar fits in landscape orientation.
- [ ] Standard mobile atlas toolbar is hidden while Draw mode is open.
- [ ] All drawing buttons meet reasonable touch-target sizing.
