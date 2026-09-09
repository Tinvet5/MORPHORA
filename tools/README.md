# MORPHORA V4.7 production tools

## Install the image-tool dependency

```bash
python -m pip install -r tools/requirements.txt
```

## Build one Deep Zoom view

```bash
python tools/build_deepzoom.py source-images/dog-cervical-c1-dorsal.jpg \
  --id dog-cervical-c1-dorsal \
  --title "Canine atlas vertebra — dorsal view" \
  --orientation dorsal \
  --alt "Dorsal view of the first cervical vertebra of a dog" \
  --create-view-json
```

Generated assets:

```text
tiles/<view-id>/<view-id>.dzi
tiles/<view-id>/<view-id>_files/<level>/<column>_<row>.jpg
images/views/<view-id>.jpg
images/thumbnails/views/<view-id>.webp
data/views/<view-id>.json
```

Use `--overwrite` only when deliberately rebuilding an existing tile pyramid. Existing view JSON files are never overwritten automatically.

## Convert a batch

```bash
python tools/import_batch.py source-images/dog/cervical-vertebrae/ \
  --prefix dog-cervical-
```

The batch tool creates image assets, starter view JSON files, and a reviewable `batch-manifest-draft.json`. It does not silently edit a live collection manifest.

## Validate the atlas

```bash
python tools/validate_atlas.py
```

The validator checks:

- Catalog, species, collection, and view references
- JSON schema version and required fields
- DZI descriptors and top-level tile availability
- Image dimensions and fallback/thumbnail paths
- Duplicate label identifiers
- Normalized anchor and label-box coordinates
- Draft labels inside available collections
- Unreferenced view files

Expected coming-soon assets are reported as warnings. Errors return a non-zero exit code and block the included GitHub Actions validation job.

## Current tooling scope

The Pillow converter is appropriate for ordinary high-resolution anatomical photographs. Extremely large microscopy or whole-slide pathology sources should later use a streaming converter such as libvips rather than loading the full master into memory.
