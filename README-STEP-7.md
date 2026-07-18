# MORPHORA V3.1 — Step 7

This version moves atlas content from `script.js` into JSON.

## Architecture

```text
data/
├── atlas.json
└── views/
    ├── dog-skull-lateral.json
    ├── dog-skull-ventral.json
    ├── dog-skull-dorsal.json
    ├── dog-skull-cranial.json
    └── dog-skull-caudal.json
```

The manifest builds the anatomical-view menu. Each view file is loaded on demand and cached for the remainder of the session.

Important: run this project through a web server. JSON fetch requests normally do not work when `index.html` is opened directly from the filesystem.
