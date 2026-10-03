# MORPHORA V4.8.2 — Drawing & Sketch Layer

V4.8.2 adds a persistent student drawing layer to the public MORPHORA atlas while preserving the V4.8.1 Content Studio refinements, Study/Quiz engine, personal notes, Deep Zoom delivery, and accessibility work.

## What is new

- Pen and translucent highlighter tools.
- Stroke eraser.
- Dedicated Pan tool plus Space + drag navigation on desktop.
- Adjustable stroke thickness and six color presets plus a custom color picker.
- Undo/redo history per anatomical view for the current browser session.
- Persistent drawings stored locally under `morphora:drawings:v1`.
- Drawings are stored by anatomical view and remain aligned during zoom, pan, resize, standard-image loading, and Deep Zoom loading.
- Show/hide drawings without deleting them.
- Clear all drawings from the current view with confirmation.
- JSON drawing backup export/import with merge or replace behavior.
- Quiz integration: drawings are automatically hidden and locked during active quiz sessions, then restored afterward.
- Drawing mode exits Study/Quiz interactions cleanly and temporarily hides official labels for a clean sketching canvas.
- Mouse, stylus, and touch input support through OpenSeadragon canvas events.
- One-finger drawing; Pan mode/Space-drag for navigation. Pinch gestures cancel an unfinished stroke so OpenSeadragon can handle zooming.

## Student workflow

1. Open an anatomical view.
2. Open the atlas controls and choose **Draw on image**.
3. Choose Pen, Highlight, Erase, or Pan.
4. Pick a color and size.
5. Draw directly on the specimen image.
6. Use Undo/Redo while working.
7. Press **Done** to return to normal atlas navigation.

Drawings save automatically to the current browser. They do not modify the original anatomical photograph or official atlas JSON.

## Keyboard shortcuts

While not typing into a form field:

- `D` — enter drawing mode.
- `P` — Pen.
- `H` — Highlighter.
- `E` — Eraser.
- `V` — Pan.
- `[` / `]` — decrease/increase brush size.
- Hold `Space` + drag — temporarily pan while drawing.
- `Ctrl/Cmd + Z` — undo.
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` — redo.
- `Esc` — leave drawing mode.

## Storage model

Storage key:

```text
morphora:drawings:v1
```

Each stroke records vector points in OpenSeadragon image/viewport coordinates, not screen pixels. Example:

```json
{
  "id": "stroke-...",
  "tool": "pen",
  "color": "#e5484d",
  "width": 0.0021,
  "opacity": 1,
  "points": [
    { "x": 0.42, "y": 0.31 },
    { "x": 0.43, "y": 0.315 }
  ]
}
```

This lets the drawing stay attached to the anatomy as the viewport zooms and pans.

## Drawing backup

The toolbar export button downloads a JSON backup similar to:

```text
morphora-drawings-YYYY-MM-DD.json
```

When importing, MORPHORA asks whether to replace all saved drawings or merge the imported strokes with existing local drawings.

## Quiz behavior

Personal sketches can reveal answers, so V4.8.2 automatically hides and locks drawings while a quiz is active. Their previous visibility is restored when the quiz ends.

## Installation

Copy the contents of this release over the V4.8.1 repository, preserving your existing `CNAME` file.

Then run:

```bash
npm run check
git add .
git commit -m "Add MORPHORA V4.8.2 drawing layer"
git push
```

The runtime/cache version is `4.8.2`. Perform a hard refresh after deployment.

## Main files changed

- `index.html`
- `style.css`
- `script.js`
- `study.js`
- `app-config.js`
- `performance.js`
- `navigation.js`
- `service-worker.js`
- `package.json`
- `studio.html` / `studio/studio.js` cache-version references

New file:

- `drawing.js`

## Current scope

V4.8.2 intentionally stores drawings as private browser data. Cloud sync and collaborative drawings belong to a future account/database milestone.

The first release exports drawing **data** as JSON. Exporting a composited PNG containing the anatomical photograph plus drawings is not included yet; that is best handled as a follow-up because Deep Zoom/canvas capture needs additional cross-browser testing.
