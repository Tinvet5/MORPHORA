# MORPHORA Histology POC v0.1

This experimental build proves that MORPHORA can stream a local Motic `.mdsx` whole-slide image through PMA.start while keeping MORPHORA's own OpenSeadragon viewer and UI.

## Slide configured in this POC

- Slide: `48515-2`
- PMA.start: `http://127.0.0.1:54001/`
- Local path: `C:/M-HISTOLOGY/48515-2/1.mdsx`
- Size: `83,457 × 97,468 px`
- Resolution: `0.267857 µm/px`
- Native objective preset: `40×`
- Tile size: `512 px`
- PMA zoom pyramid: `0…8`
- Format: `Motic MDSX (JPEG 75)`

## How to run it

1. Start **PMA.start** and leave it running.
2. Open this MORPHORA folder in VS Code.
3. Start **Live Server** from `index.html` or directly from `histology-poc.html`.
4. Open **Histology POC** from the MORPHORA home page.
5. Click **Authorize browser**. PMA.start will open its local allow-domain page for the Live Server origin.
6. Approve/allow the origin in PMA.start, then return to MORPHORA.
7. Click **Connect slide**.
8. Use the 5× / 10× / 20× / 40× controls, pan, zoom, navigator, scale bar and fullscreen.

If the slide was moved, use **Edit** under *Slide connection* and change the local slide path. The settings are kept only in the browser for this POC.

## Architecture

```text
1.mdsx (~1.2 GB)
       │
       ▼
PMA.start @ 127.0.0.1:54001
       │  GetImageInfo + /tile
       ▼
MORPHORA Histology POC
       │
       ▼
OpenSeadragon custom tile source
```

The browser never downloads the full `.mdsx`; it asks PMA.start only for the 512×512 tiles needed for the current viewport.

## Production note

This is intentionally a **local proof of concept**. `morphora.cl` should not depend on every student running PMA.start. If the POC succeeds, the production Histology pipeline should move WSI content to an institution/MORPHORA-accessible tile service or a preprocessing pipeline that emits a web-standard pyramid.
