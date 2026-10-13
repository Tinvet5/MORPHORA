# MORPHORA Histology Library v0.8.1

## Hosted Slide Pilot & Integrity Checks

v0.8.1 turns the provider-independent architecture introduced in v0.8 into a practical migration workflow for the first hosted whole-slide pilot.

### What changed

- Added an in-app **Hosted source check** to Histology Setup.
- Added **Use local DZI pilot**, which switches the current slide to Hosted DZI only and points to the bundled local pilot convention on port 8008.
- Added **Restore Auto** to return to the manifest-defined hosted-first/PMA.start-fallback behavior.
- Hosted DZI sources now require **exact pixel-dimension equality** with the MORPHORA slide manifest before they are accepted. This protects official labels, personal labels, drawings, regions and Locate grading from coordinate drift.
- The hosted check validates the DZI descriptor and retrieves a real level-0 tile before reporting Ready.
- Added `pilot_slide.py` to orchestrate conversion/validation/local serving.
- Added `check_hosted_url.py` for later production URL and optional CORS verification.
- Added Windows helpers for the Hueso-4 pilot.
- Added `hosted-slides/.gitignore` so generated tile pyramids are not accidentally committed to Git.

### Pilot target

The first migration target remains **Hueso-4 / Decalcified compact bone**:

- 21,959 × 59,088 px
- 0.267857 µm/px
- current master: Motic MDSX package

MORPHORA will reject a DZI derivative whose width or height differs from the manifest.

### Quick pilot

After a compatible Hueso-4 export exists:

```text
python tools/histology_wsi/pilot_slide.py --slide-id hueso-4 --input <exported-wsi> --serve
```

Then open Hueso-4 in MORPHORA and choose:

```text
Histology Setup → Use local DZI pilot
```

A successful open in that mode proves the slide is being read from the local DZI HTTP server rather than PMA.start.

See `HOSTED-WSI-PILOT-GUIDE-v0.8.1.md` for the complete workflow.

### Database

No Supabase migration is required. v0.8.1 changes WSI delivery diagnostics and tooling only.
