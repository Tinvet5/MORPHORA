# MORPHORA Histology POC v0.2

Histology POC v0.2 turns the successful v0.1 whole-slide experiment into a first-class MORPHORA module while preserving the working PMA.start + OpenSeadragon transport.

## What changed

- New dedicated `histology.html` landing page linked from the main MORPHORA home.
- Histology-specific visual identity:
  - light mode: white, blush pink, mauve and restrained purple;
  - dark mode: deep plum, berry, pink and violet.
- Scanner-independent Histology catalog (`histology/catalog.json`).
- Rich slide manifest for slide `48515-2` with bilingual metadata.
- First specimen registered as:
  - Species: Equine / Equino
  - Organ: Lymph node / Linfonodo
  - Category: Histopathology / Histopatología
  - Diagnosis: Abscessed lymph node / Linfonodo abscedado
  - Stain: Hematoxylin & eosin (H&E) / Hematoxilina y eosina (H&E)
  - Native magnification: 40×
  - Resolution: 0.267857 µm/px
- Viewer redesigned to match the Histology module theme.
- English/Spanish switching on the Histology landing page and viewer, using the existing `morphora:language` preference.
- Theme preference shared with the core MORPHORA app through `morphora:theme`.
- New `schemas/histology-slide.schema.json` foundation for future scanner-independent slides and point/polygon structure annotations.
- `structures: []` added to the slide manifest as the foundation for Histology Studio/labeling in the next content iteration.
- Service-worker shell now recognizes Histology routes and local module assets.
- Histology-specific validation script: `npm run check:histology`.

## Local test

1. Keep PMA.start running.
2. Open this folder in VS Code.
3. Start Live Server from `index.html`.
4. Select **Histology** from the MORPHORA home screen.
5. Open **Equine abscessed lymph node**.
6. If needed, click **Authorize browser** and approve the Live Server origin in PMA.start.
7. Click **Connect slide**.
8. Verify 5×, 10×, 20× and 40× navigation, physical scale bar, minimap and fullscreen.

## Important

This remains a local proof of concept. PMA.start is a development bridge for reading the Motic MDSX source. A production MORPHORA Histology release should serve a web-ready pyramidal representation from object storage/CDN and must not require PMA.start on the learner's device.
