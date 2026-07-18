# MORPHORA atlas data

MORPHORA now separates anatomical content from application logic.

## Files

- `atlas.json` is the manifest. It defines the atlas metadata, view order, button names, and the default view.
- `views/*.json` contains one anatomical photograph and its labels.

## Add a new anatomical view

1. Add the image to the `images/` folder using a lowercase descriptive filename.
2. Copy an existing file in `data/views/` and rename it.
3. Give the view and every label a unique lowercase ID.
4. Set `image.src` to the image path.
5. Add the label names, descriptions, and normalized positions.
6. Register the new view in `data/atlas.json`.

Example manifest entry:

```json
{
  "id": "dog-skull-medial",
  "buttonLabel": "Medial",
  "dataPath": "data/views/dog-skull-medial.json"
}
```

Example label:

```json
{
  "id": "example-structure",
  "name": "Example structure",
  "description": "Anatomical description.",
  "position": {
    "x": 0.5,
    "y": 0.5
  }
}
```

`x` and `y` are normalized image coordinates from `0` to `1`.

## Local development

JSON is loaded with `fetch()`. Do not open `index.html` directly with a `file:///` address. Use a local web server such as VS Code Live Server, or run:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`.
