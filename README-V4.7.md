# MORPHORA V4.7 — Performance, Deep Zoom & Production Hardening

V4.7 builds on the complete V4.6 responsive/accessibility release. It preserves the atlas navigation, Content Studio, official labels, personal annotations, local drafts, branding, and routes.

## Included in this release

### Deep Zoom delivery

All five current canine skull photographs are supplied as Deep Zoom Image pyramids:

```text
tiles/dog-skull-lateral/
tiles/dog-skull-ventral/
tiles/dog-skull-dorsal/
tiles/dog-skull-cranial/
tiles/dog-skull-caudal/
```

Each view starts with a small overview and loads detailed tiles only for the visible area and zoom level. The original JPG files remain as automatic fallbacks.

The view schema is backward compatible:

```json
{
  "image": {
    "type": "dzi",
    "src": "tiles/dog-skull-lateral/dog-skull-lateral.dzi",
    "fallback": "images/lateral.jpg",
    "thumbnail": "images/thumbnails/views/dog-skull-lateral.webp",
    "width": 6000,
    "height": 4000,
    "alt": "Lateral view of a canine skull"
  }
}
```

Normal JPG, PNG, and WebP views still work. When `type` is absent, the loader infers the source type from the file extension.

### Automatic fallback

When a DZI descriptor or tile source cannot be opened, the public atlas and Content Studio automatically try the configured standard image. A small `Compatible image` badge indicates fallback mode.

### Studio compatibility

The Studio now opens normal images and DZI sources through the same image abstraction. Label anchors and label-box positions remain normalized, so existing coordinates do not change during conversion.

### Loading and prefetching

- Loading states distinguish metadata, Deep Zoom preview, and fallback loading.
- The next anatomical orientation is conservatively prefetched after the current view opens.
- Prefetching is disabled on save-data and very slow connections.
- Navigation thumbnails remain lazy-loaded.
- The OpenSeadragon CDN script is deferred so it no longer blocks document parsing.

### Performance diagnostics

Append this query to a MORPHORA URL:

```text
?debug=performance
```

The browser console will report catalog, manifest, view-data, image-open, and first-tile timing marks.

### Central runtime configuration

`app-config.js` is the primary runtime configuration file:

```js
version: "4.7.0"
prefetchAdjacentViews: true
enableServiceWorker: true
```

The atlas, navigation, Studio, performance module, and service worker read this configuration.

### Offline resilience

`service-worker.js` caches the MORPHORA application shell and stores same-origin resources as they are used. It does not pre-download every Deep Zoom tile. Previously opened content may remain available during a temporary connection interruption.

### Production tooling

```text
tools/build_deepzoom.py
tools/import_batch.py
tools/validate_atlas.py
tools/requirements.txt
```

The converter generates DZI pyramids, standard fallbacks, WebP thumbnails, and optional starter view JSON files. The validator checks the complete catalog hierarchy, assets, DZI descriptors, label IDs, and normalized coordinates.

### GitHub validation

`.github/workflows/validate-atlas.yml` runs atlas validation and JavaScript syntax checks on pushes and pull requests. A malformed published view produces a failed check before deployment.

## Installation

1. Back up the current repository.
2. Copy the **contents** of this V4.7 folder into the GitHub Pages repository root.
3. Keep the existing `CNAME` file containing `morphora.cl`.
4. Commit every generated tile folder; DZI views require the descriptor and all `_files` levels.
5. Push to GitHub.
6. Wait for the validation and Pages deployment checks.
7. Open MORPHORA and perform one hard refresh.

```text
Ctrl + Shift + R
```

V4.7 includes `.nojekyll`, which should remain in the repository root.

## Validate before publishing

With Python installed:

```bash
python tools/validate_atlas.py
```

Or with Node available:

```bash
npm run check
```

The included starter cervical view still has no photograph. The validator reports that intentionally missing coming-soon asset as a warning, not an error.

## Add a new photograph

Install Pillow once:

```bash
python -m pip install -r tools/requirements.txt
```

Then build a view:

```bash
python tools/build_deepzoom.py source-images/dog-cervical-c1-dorsal.jpg \
  --id dog-cervical-c1-dorsal \
  --title "Canine atlas vertebra — dorsal view" \
  --orientation dorsal \
  --alt "Dorsal view of the first cervical vertebra of a dog" \
  --create-view-json
```

Register the generated view in the correct collection manifest, open it in Studio, author labels, export the completed JSON, validate, and publish.

See `DEEP-ZOOM-CONTENT-WORKFLOW.md` and `tools/README.md` for the full procedure.

## Storage note

Deep Zoom creates many small tile files. The current five-view pilot is suitable for GitHub Pages, but repository size should be reviewed as MORPHORA expands to many species or extremely large microscopy datasets. Future large-scale image storage can use object storage or an image service without changing normalized labels.

## Offline limitation

V4.7 provides cache-based resilience rather than a fully downloadable offline atlas. OpenSeadragon 4.1.0 remains loaded from the cdnjs CDN, so the first visit still requires a network connection. A previously opened session may continue to use browser-cached dependencies and same-origin content, but complete offline startup is not guaranteed until OpenSeadragon is hosted locally in a future release.
