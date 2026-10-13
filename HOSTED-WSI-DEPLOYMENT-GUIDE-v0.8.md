# MORPHORA Hosted WSI Deployment Guide — v0.8

## 1. Keep masters private

The original scanner package (`.mdsx` plus companion files) is the archival master. Do not replace it with web tiles and do not place the original package in the public GitHub repository.

## 2. Produce a web derivative

MORPHORA v0.8 uses Deep Zoom Image (DZI) pyramids for the first hosted provider. A published slide has this shape:

```text
<slide-id>/
├── slide.dzi
└── slide_files/
    ├── 0/
    ├── 1/
    ├── ...
    └── <max-level>/
```

Run:

```text
python tools/histology_wsi/convert_to_dzi.py --input <compatible-wsi> --slide-id hueso-4
```

The converter calls `libvips dzsave`. If libvips/OpenSlide cannot read an MDSX container, first export that MDSX to a compatible pyramidal master such as pyramidal TIFF/OME-TIFF/SVS using software that can read the Motic package, then run the converter on that exported file.

## 3. Validate

```text
python tools/histology_wsi/validate_dzi.py \
  --manifest histology/slides/hueso-4.json \
  --dzi hosted-slides/hueso-4/slide.dzi
```

Width and height must match the MORPHORA slide manifest before publishing.

## 4. Test without PMA.start

```text
python tools/histology_wsi/serve_tiles.py --root hosted-slides --port 8008
```

Then open Histology Setup and test:

```text
Source mode: Hosted DZI only
Hosted DZI descriptor: http://127.0.0.1:8008/hueso-4/slide.dzi
```

This proves the browser is reading the DZI pipeline rather than PMA.start.

## 5. Upload to object storage/CDN

Upload the whole `<slide-id>` directory without renaming or flattening anything. The hosting layer must provide:

- HTTPS
- public/read-authorized GET access for the student browser
- CORS access from `https://morphora.cl` when using a different origin
- correct image MIME types for tile files
- stable URLs
- long-lived caching for immutable tiles

GitHub Pages/repository storage is not the intended home for multi-gigapixel WSI pyramids.

## 6. Register the final descriptor URL

```text
python tools/histology_wsi/register_hosted_slide.py \
  --manifest histology/slides/hueso-4.json \
  --url https://<tile-host>/histology/hueso-4/slide.dzi \
  --mode auto
```

`auto` is recommended during migration because it keeps PMA.start as a developer fallback. Once hosted delivery is proven for a slide, `hosted` can be used to require the production source.

## 7. Verify in MORPHORA

The developer panel should report **Hosted DZI** as the active provider. All educational overlays use normalized slide coordinates and therefore should remain aligned without re-authoring labels.
