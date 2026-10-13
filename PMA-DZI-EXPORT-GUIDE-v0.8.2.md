# MORPHORA Histology v0.8.2 — PMA → DZI Export Guide

## Purpose

v0.8.2 converts an MDSX slide that PMA.start can already read into a static Deep Zoom Image (DZI) derivative that MORPHORA can serve without PMA.start.

PMA.start is used **once on the developer computer during ingestion**. It is not part of the student delivery architecture.

```text
MDSX master → PMA.start → MORPHORA exporter → static DZI → object storage/CDN → student browser
```

The original `.mdsx` package remains the private master. The generated DZI is a web derivative.

## Hueso-4 pilot

Expected MORPHORA geometry:

- Slide ID: `hueso-4`
- Native dimensions: `21,959 × 59,088 px`
- PMA.start: `http://127.0.0.1:54001/`
- Source path: `C:/M-HISTOLOGY/HUESO/Hueso-4/1.mdsx`

### 1. Keep PMA.start running

Confirm Hueso-4 opens normally in PMA.start / MORPHORA local mode.

### 2. Run the preflight first

Double-click:

```text
tools\histology_wsi\plan_hueso4_pma_export.cmd
```

Or from the MORPHORA project folder:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --plan
```

The preflight contacts PMA.start, reads `GetImageInfo`, and refuses to continue if the PMA geometry differs from the MORPHORA manifest. This protects all normalized labels, drawings, regions and Locate targets.

### 3. Export Hueso-4

The easiest Windows path is:

```text
tools\histology_wsi\export_hueso4_from_pma.cmd
```

Or:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --serve
```

The exporter will create:

```text
hosted-slides/
└── hueso-4/
    ├── slide.dzi
    ├── slide_files/
    │   ├── 0/
    │   ├── 1/
    │   └── ...
    ├── thumbnail.jpg        (when PMA provides it)
    ├── barcode.jpg          (when PMA provides it)
    └── .morphora-export.json
```

The generated tile pyramid is ignored by Git through `hosted-slides/.gitignore`.

## How the conversion works

MORPHORA does not reconstruct the slide from one giant screenshot. PMA.start already exposes the scanner pyramid as tiles.

The exporter:

1. Reads PMA slide metadata.
2. Verifies the exact native dimensions against the MORPHORA manifest.
3. Maps PMA zoom levels onto equivalent standard DZI levels.
4. Downloads each PMA tile only once.
5. Generates the very small DZI overview levels using PMA rendered regions.
6. Writes a standard `slide.dzi` descriptor.
7. Validates the result with MORPHORA's DZI validator.
8. Optionally starts the local CORS tile server on port `8008`.

For Hueso-4 the export is expected to involve several thousand tiles. The exact count comes from live PMA metadata and is printed before export.

## Resume behavior

The exporter writes each tile atomically. Completed files remain in place if Windows closes, the network request fails, or the export is interrupted.

Run the same command again to resume. Existing complete tiles are skipped.

Use `--force` only when you intentionally want to delete the existing derivative and rebuild it from zero.

## Local PMA-free proof

After export, leave the local DZI server running and open:

```text
MORPHORA → Histology → Hueso-4 → ⚙ Histology Setup
```

Then press:

```text
Use local DZI pilot
```

MORPHORA switches to **Hosted DZI only** mode and uses:

```text
http://127.0.0.1:8008/hueso-4/slide.dzi
```

Now close PMA.start completely and reload the slide.

**Success criterion:** Hueso-4 still opens, pans and zooms normally, and all overlays remain aligned.

## Useful commands

Plan only:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --plan
```

Export and immediately serve:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --serve
```

Resume:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --serve
```

Start only the already-generated DZI server:

```bat
python tools\histology_wsi\serve_tiles.py --root hosted-slides --port 8008
```

Rebuild from zero:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --force --serve
```

Reduce concurrent PMA requests on a slower machine:

```bat
python tools\histology_wsi\export_from_pma.py --slide-id hueso-4 --workers 3 --serve
```

## Production later

v0.8.2 creates the static derivative. It does **not** upload tiles to the public internet.

The next production-hosting step is to copy the completed `hosted-slides/hueso-4/` directory into object storage/CDN and register the public HTTPS `slide.dzi` URL in the Hueso-4 manifest.
