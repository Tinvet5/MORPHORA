# MORPHORA Histology Library v0.4.1 — Drawing Interaction Hotfix

This hotfix preserves the v0.4 Student Workspace and fixes the whole-slide drawing interaction.

## Fixed
- Drawing tools now open without a modal backdrop, so pointer input reaches the slide canvas.
- Drawing drawer stays open while the student draws on the WSI.
- Pointer capture is retained until pointer-up/cancel.
- Pen/highlighter/eraser no longer depend on mouse-only `event.buttons`, improving mouse, pen and touch reliability.
- Pointer events are stopped before they reach OpenSeadragon or surrounding panel handlers while drawing is active.
- Asset/cache version bumped to v0.4.1 to prevent stale v0.4 JavaScript from being reused.

## Test
1. Run PMA.start and open any Histology slide.
2. Select Draw.
3. Pick Pen or Highlighter and drag over the specimen. The drawer must remain open and the stroke must appear.
4. Pan/zoom after pressing Done and confirm the stroke remains anchored to the same slide location.
5. Reopen Draw, test Eraser and Undo.
