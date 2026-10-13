# MORPHORA Histology Library v0.8.2

## PMA → DZI Export Pipeline

v0.8.2 turns PMA.start from a runtime dependency into an **ingestion bridge** for proprietary Motic MDSX masters.

### New in this release

- `tools/histology_wsi/export_from_pma.py`
  - zero third-party Python dependencies
  - reads PMA.start metadata and tile endpoints
  - validates native geometry before export
  - maps PMA zoom levels into a standalone DZI pyramid
  - generates missing tiny DZI overview levels
  - concurrent tile retrieval with retries
  - atomic file writes
  - safe resume after interruption
  - optional associated thumbnail/barcode export
  - final MORPHORA DZI integrity validation
  - optional local CORS serving for immediate pilot testing
- Windows helpers:
  - `plan_hueso4_pma_export.cmd`
  - `export_hueso4_from_pma.cmd`
- Histology Setup now displays the current slide's exact PMA-export command with a copy button.
- Existing libvips conversion remains available as an optional ingestion route for standard WSI formats.

### Important architecture rule

PMA.start is required only while **MORPHORA developers prepare an MDSX master**. The generated web derivative is static and can later be hosted in object storage/CDN. Students do not need PMA.start, Motic software, libvips, or the original MDSX package.

### Hueso-4 success criterion

1. Export Hueso-4 through PMA.start.
2. Serve the generated DZI on port 8008.
3. Switch MORPHORA to **Hosted DZI only** using the local pilot button.
4. Close PMA.start.
5. Reload Hueso-4.
6. Confirm the slide and all normalized overlays still work.

See `PMA-DZI-EXPORT-GUIDE-v0.8.2.md` for the complete workflow.

No Supabase migration is required.
