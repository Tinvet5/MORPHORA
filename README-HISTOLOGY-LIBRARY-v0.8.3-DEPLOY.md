# MORPHORA Histology v0.8.3 — Two-slide hosted integration

This updates the **existing MORPHORA site**. It does not create a second website.

## Prerequisites
- In Cloudflare R2, keep bucket `morphora-histology-private` **private**.
- Hueso-1 and Hueso-4 are already uploaded beneath `hueso-1/` and `hueso-4/`.
- Confirm you're willing to expose these two images as downloadable guest tiles.

## Safe deployment order
1. Back up the deployed Cloudflare Worker code. Do not paste tokens into this source folder.
2. Deploy `worker.js` from the **separate** MORPHORA-Histology-v0.8.3-Cloud-Gateway archive. Keep the existing R2 binding `HISTOLOGY_BUCKET` and your existing Supabase/allowed-origin variables.
3. Configure `DEMO_ENABLED=true` and `DEMO_ENDS_AT=2026-10-17T03:00:00Z` if guest access is intended only through Friday 16 October (Chile UTC-3). Disable the flag immediately to revoke guest routes early.
4. Verify the Worker is online: /health -> 200; /slides/hueso-1/slide.dzi -> 401 when not signed in; /demo/slides/hueso-1/slide.dzi and /demo/slides/hueso-4/slide.dzi -> 200 with correct DZI dimensions; /demo/slides/hueso-5/slide.dzi -> 404; tile `/demo/slides/hueso-1/slide_files/0/0_0.jpg` -> JPEG.
5. Extract this ZIP with its parent folder and run the existing project locally through VS Code Live Server. Open `histology.html`, then Hueso-1 and Hueso-4 with PMA.start closed. Test both in incognito without signing in. Verify tile loads and navigation.
6. **Only after the tests pass**, back up/commit your current live GitHub Pages site, then deploy the existing MORPHORA website's updated source. Verify on https://morphora.cl/histology.html and a second device on cellular data.

## Important
- Hueso-1/Hueso-4 are the only cloud-hosted slides currently available to guests. This is **not** an all-six-slide launch.
- This build does not include tiles; the browser requests them from Cloudflare R2 through the Worker.
- The guest route is public and images are extractable, even though R2 itself remains private.
- When demo access expires, disable the on-site demo CTA or make an explicit decision to offer long-term public samples; otherwise visitors will encounter a dead link.
- Keep the previous known-good v0.8.2 working site and Worker copy to roll back.
