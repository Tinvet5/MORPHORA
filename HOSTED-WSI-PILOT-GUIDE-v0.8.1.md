# MORPHORA Hosted WSI Pilot Guide — v0.8.1

## Goal

Prove that **Hueso-4** can open in MORPHORA with PMA.start completely removed from the image-delivery path.

The pilot uses a local HTTP server first. This isolates slide conversion/viewer correctness from later object-storage/CDN configuration.

## 1. Preserve the original master

Keep the complete Motic Hueso-4 package unchanged:

```text
C:\M-HISTOLOGY\HUESO\Hueso-4\
└── 1.mdsx + companion files
```

Do not place the MDSX package in Git or replace it with the web derivative.

## 2. Obtain a conversion-readable source

You can first attempt conversion using a source readable by libvips/OpenSlide. MDSX support depends on the installed readers and may fail.

If MDSX is not readable, export Hueso-4 with Motic/Pathomation-compatible software to a loss-preserving pyramidal master such as pyramidal TIFF, OME-TIFF or SVS. The exported image must preserve the full pixel dimensions:

```text
21,959 × 59,088 px
```

Do not resize or resample the slide.

## 3. Prepare and serve the pilot

From the MORPHORA project folder:

```text
python tools/histology_wsi/pilot_slide.py \
  --slide-id hueso-4 \
  --input "C:\path\to\hueso-4-export.tif" \
  --serve
```

On Windows you can also run:

```text
tools\histology_wsi\prepare_hueso4_pilot.cmd
```

The tool will:

1. convert the compatible WSI to DZI using libvips,
2. verify exact dimensions against `histology/slides/hueso-4.json`,
3. verify the DZI tile tree,
4. start the CORS-enabled local tile server on port 8008.

Expected descriptor:

```text
http://127.0.0.1:8008/hueso-4/slide.dzi
```

## 4. Prove PMA.start is no longer serving the slide

Open MORPHORA through Live Server as usual, then open Hueso-4.

Go to:

```text
⚙ Histology Setup
→ Hosted source check
→ Use local DZI pilot
```

This changes the current developer setting to **Hosted DZI only**. It does not use PMA.start as fallback.

The check must report **Ready** and confirm:

```text
21,959 × 59,088 px
Tile 512
First tile reachable
```

Now stop PMA.start completely. Refresh/reopen Hueso-4. If the slide still opens and the active provider says **Hosted DZI**, the pilot is successful.

## 5. Regression checks on the hosted derivative

Verify on the DZI source:

- navigator works,
- 5× / 10× / 20× / 40× controls work,
- scale bar remains correct,
- official Studio labels remain aligned,
- My Labels remain aligned,
- polygon zones remain aligned,
- drawings remain aligned,
- Locate grading still hits the intended structure/region,
- notes/bookmarks/cloud sync behave normally.

The exact-dimension gate is intentionally strict because all of these systems depend on normalized coordinates mapping back to the same source pixels.

## 6. Production comes after the local pilot

After Hueso-4 passes locally, upload the complete directory:

```text
hosted-slides/hueso-4/
├── slide.dzi
└── slide_files/
```

to object storage/CDN. Then verify the public endpoint:

```text
python tools/histology_wsi/check_hosted_url.py \
  --manifest histology/slides/hueso-4.json \
  --url https://<tile-host>/histology/hueso-4/slide.dzi \
  --require-cors
```

Only after that check passes should the production HTTPS descriptor be written into the Hueso-4 manifest with `register_hosted_slide.py`.
