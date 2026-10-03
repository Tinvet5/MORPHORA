# MORPHORA V4.4 — Content Authoring Studio

V4.4 adds a browser-based internal workspace for creating and maintaining anatomical labels without manually estimating image coordinates or editing JSON line by line.

## Open the Studio

Run MORPHORA through a web server and open:

- `http://localhost:5500/studio.html`
- or `https://morphora.cl/studio.html`
- `https://morphora.cl/#/studio` redirects to the Studio page.

Do not double-click `studio.html` from the filesystem. The Studio loads JSON with `fetch()` and therefore requires Live Server, GitHub Pages, or another HTTP server.

## Important security limitation

This first Studio release has no account system or authentication. The page is marked `noindex`, and it cannot modify the GitHub repository directly, but anyone who knows the URL can open the interface.

For private use, either:

1. Use `studio.html` locally and do not deploy the Studio files, or
2. Deploy it later behind a protected backend/authentication layer.

The Studio only stores drafts in the current browser and exports JSON files. It does not upload, publish, or overwrite repository content.

## Workflow

1. Select a species, system, collection, and view.
2. Choose **Add label**.
3. Click the exact anatomical structure.
4. Enter the structure name, identifier, description, category, and publishing status.
5. Drag the anchor dot to adjust the anatomical point.
6. Drag the text box to adjust its image-relative position.
7. Review validation notices.
8. Select **Export JSON**.
9. Replace the matching file in `data/views/` with the exported file.
10. Commit and push the replacement JSON to GitHub.

## Key features

- Loads species, systems, collections, manifests, and views from the existing MORPHORA JSON architecture.
- Works with every collection that has a `manifestPath`.
- Loads and edits existing labels.
- Click-to-create anchors.
- Draggable anchor and label positions.
- Automatic normalized coordinates.
- Label list, search, duplicate, and delete tools.
- Category and publishing-status metadata.
- Student-preview mode.
- Undo and redo.
- Local browser drafts.
- Unsaved-change warning.
- JSON import, copy, validation, and export.
- Backward-compatible support for old labels that contain only `position`.

## Updated label structure

Existing data remains valid:

```json
{
  "id": "zygomatic-arch",
  "name": "Arco Cigomático",
  "description": "Descripción anatómica pendiente.",
  "position": {
    "x": 0.395,
    "y": 0.315
  }
}
```

The Studio can add optional image-relative label placement and editorial metadata:

```json
{
  "id": "zygomatic-arch",
  "name": "Arco Cigomático",
  "description": "Descripción anatómica pendiente.",
  "position": {
    "x": 0.395,
    "y": 0.315
  },
  "labelPosition": {
    "x": 0.29,
    "y": 0.27
  },
  "category": "bone-landmark",
  "status": "published"
}
```

- `position` is the anatomical anchor.
- `labelPosition` is the center of the text box in the same normalized image coordinate system.
- `labelPosition` is optional. Existing labels continue using MORPHORA's automatic left/right placement.

## Keyboard shortcuts

- `Ctrl/Cmd + S` — save a local draft
- `Ctrl/Cmd + E` — export JSON
- `Ctrl/Cmd + Z` — undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y` — redo
- `Escape` — return to Browse mode
- `Delete` — delete the selected label when a form field is not focused

## Files added

```text
studio.html
studio/
├── studio.css
└── studio.js
```

## Files updated

- `index.html` — V4.4 cache version and `#/studio` redirect.
- `script.js` — supports optional `labelPosition`, `category`, and `status` without breaking older JSON.
- `navigation.js` — V4.4 cache version.
- `data/views/VIEW-TEMPLATE.json` — documents the expanded label schema.

## Deployment

Copy the contents of the V4.4 folder into the GitHub Pages publishing root. Keep the existing `CNAME` file.

The cache version is `4.4.0`.
