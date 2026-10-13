# MORPHORA V4.7 content workflow

## 1. Archive the masters

Keep untouched TIFF/JPG/RAW masters outside the public website repository and back them up independently.

## 2. Prepare publishable working copies

Apply crop, exposure, white balance, orientation, and background cleanup consistently. Use lowercase hyphenated identifiers:

```text
dog-cervical-c1-dorsal.jpg
dog-cervical-c1-ventral.jpg
dog-cervical-c1-lateral.jpg
```

## 3. Stage the files locally

```text
source-images/
└── dog/
    └── cervical-vertebrae/
```

The folder is ignored by Git so source photography is not accidentally published.

## 4. Convert one image

```bash
python tools/build_deepzoom.py source-images/dog/cervical-vertebrae/dog-cervical-c1-dorsal.jpg \
  --id dog-cervical-c1-dorsal \
  --title "Canine atlas vertebra — dorsal view" \
  --orientation dorsal \
  --alt "Dorsal view of the first cervical vertebra of a dog" \
  --create-view-json
```

The command creates:

```text
tiles/dog-cervical-c1-dorsal/
images/views/dog-cervical-c1-dorsal.jpg
images/thumbnails/views/dog-cervical-c1-dorsal.webp
data/views/dog-cervical-c1-dorsal.json
```

## 5. Convert a batch

```bash
python tools/import_batch.py source-images/dog/cervical-vertebrae/ \
  --prefix dog-cervical-
```

Review `batch-manifest-draft.json`. The tool deliberately does not modify a live collection manifest automatically.

## 6. Register each view

Add each entry to its collection file:

```json
{
  "id": "dog-cervical-c1-dorsal",
  "buttonLabel": "C1 · Dorsal",
  "dataPath": "data/views/dog-cervical-c1-dorsal.json",
  "thumbnail": "images/thumbnails/views/dog-cervical-c1-dorsal.webp"
}
```

## 7. Author labels in Studio

Open `studio.html`, select the view, add and position labels, validate, and export the complete JSON. Replace the matching file under `data/views/`.

## 8. Validate

```bash
python tools/validate_atlas.py
```

Correct all errors before publishing. Review warnings deliberately.

## 9. Test locally

```bash
python -m http.server 5500
```

Check the public atlas and Studio:

- Initial overview appears.
- Zoomed areas sharpen progressively.
- Labels remain aligned.
- Personal notes remain aligned.
- Orientation switching works.
- Fallback works when the DZI path is temporarily changed during local testing.

## 10. Publish

```bash
git add .
git commit -m "Add canine cervical C1 dorsal view"
git push
```

Wait for the GitHub validation job and Pages deployment before reviewing the live site.
