# MORPHORA V3.2 — Species Navigation

This milestone adds a JSON-driven navigation shell around the existing Step 7 anatomical viewer.

## Routes

- `#/species` — species library
- `#/species/dog` — canine anatomy hub
- `#/species/dog/skeletal/skull` — canine skull atlas (default view)
- `#/species/dog/skeletal/skull/dog-skull-lateral` — direct lateral-view link
- Equivalent direct links exist for ventral, dorsal, cranial/frontal and caudal views.

Hash routes are used so direct links and page refreshes remain compatible with GitHub Pages.

## New files

- `navigation.js` — routing, species screens, drawer, breadcrumbs and theme persistence
- `data/catalog.json` — top-level species catalog
- `data/species/dog.json` — canine systems and collections

## Existing viewer preserved

The Step 7 OpenSeadragon viewer remains in `script.js`. It now exposes a small public API so the navigation shell can open and deactivate atlas views without duplicating viewer logic.

## Adding a species

1. Add an entry to `data/catalog.json`.
2. Create `data/species/<species-id>.json`.
3. Set the catalog entry status to `available` and provide its `dataPath`.
4. Add collections and manifests as content becomes available.

## Adding a canine collection

Add a new collection inside the appropriate system in `data/species/dog.json`. Available collections should include a `manifestPath` and a hash `route`.

## Local development

Run the project through a local web server because JSON uses `fetch()`:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.

VS Code Live Server also works.

## Branding

The header currently uses a temporary CSS monogram and text wordmark. Replace these with the official designer assets when the finalized SVG/PNG files are ready. The navigation structure does not depend on the temporary mark.
