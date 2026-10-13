# Histology Library v0.8 Test Checklist

## Existing local workflow
- Open each slide with PMA.start while hosted URL is blank.
- Confirm Auto mode falls back to PMA.start.
- Confirm viewer, scale bar, navigator, Study, Quiz, Locate, Studio, My Labels, Notes, Draw and Bookmarks still work.
- Confirm cloud status and Histology workspace sync remain functional.

## Hosted provider
- Generate or provide a valid DZI pyramid.
- Serve it with `python tools/histology_wsi/serve_tiles.py --root hosted-slides`.
- In Histology Setup set Source mode to Hosted DZI only.
- Enter `http://127.0.0.1:8008/<slide-id>/slide.dzi` and Save & reconnect.
- Confirm the slide opens without PMA.start.
- Confirm magnification, scale bar, coordinates, labels, personal annotations and drawings remain aligned.

## Auto fallback
- Set Auto with a valid hosted URL and confirm Hosted DZI is active.
- Break the hosted URL while PMA.start is running and confirm fallback to PMA.start.
- Stop PMA.start too and confirm a clear connection error is shown.

## Deployment pipeline
- Run DZI conversion on a libvips-readable WSI.
- Validate descriptor dimensions against the MORPHORA manifest.
- Upload `slide.dzi` and `slide_files/` without changing their relative layout.
- Register the final HTTPS DZI URL.
- Confirm public GET/CORS behavior from the deployed MORPHORA origin.

## Regression
- v0.7.1 desktop viewport remains bounded.
- Mobile document scrolling remains enabled.
- Guest/account workspaces remain isolated.
- Official Studio content remains separate from personal cloud data.
