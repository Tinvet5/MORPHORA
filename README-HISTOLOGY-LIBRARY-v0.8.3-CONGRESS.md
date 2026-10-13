# MORPHORA Histology v0.8.3 — Congress guest demo (14–16 Oct 2026)

## What is ready
- Hueso-4 is the only remotely accessible Histology slide in this build.
- The DZI descriptor and its tiles are read from `morphora-histology-private/hueso-4/` through the Cloudflare Worker.
- `/demo/slides/hueso-4/*` supports **read-only, anonymous** exploration, for the congress only.
- `/slides/hueso-4/*` remains protected by Supabase ES256 JWT verification **and** `ALLOWED_USER_IDS`.
- Other WSI cards display "Coming soon" on the public site because their source still requires local PMA.start.
- Guest drawings, annotations and notes follow the existing v0.8.2 local-browser workspace rules; personal cloud sync still requires sign-in.

**Important IP trade-off:** Anyone can download the publicly available Hueso-4 tiles during the demo, not just congress attendees. Do not enable if the slide must remain confidential. Only this slide is accessible; R2 stays private.

## Stage 1 — Backup and Worker deployment (do this FIRST)
1. Open Cloudflare > Workers & Pages > `morphora-histology-gateway` > Edit code.
2. Save the currently deployed Worker source locally as `worker-pre-congress-backup.js`.
3. Replace the Worker source with `cloud-gateway/worker.js` and **Deploy**.
4. **Retain** the existing R2 binding named `HISTOLOGY_BUCKET` and existing `SUPABASE_URL`, `ALLOWED_USER_IDS`, `ALLOWED_ORIGINS` variables. Do not expose your R2 bucket.
5. In the Worker's Production **Variables and secrets**, add:
   - `DEMO_ENABLED` = `true` (Text)
   - `DEMO_ENDS_AT` = `2026-10-17T03:00:00Z` (Text) = midnight at the end of Friday Oct 16 in Chile (UTC−03:00).
6. Deploy the variables. Do **not** share secrets, access keys or session tokens. These are only non-secret text variables.

## Stage 2 — Test access using your browser
Worker origin shown during setup:
`https://morphora-histology-gateway.martin-fuentesvet.workers.dev`

- Health: `/health` -> `MORPHORA histology gateway online` (HTTP 200).
- Private endpoint in a fresh browser tab: `/slides/hueso-4/slide.dzi` -> HTTP 401 JSON `Authentication required`.
- Guest endpoint: `/demo/slides/hueso-4/slide.dzi` -> HTTP 200 and XML describing a DZI image (expected width 21959, height 59088).
- Guest low-resolution tile: `/demo/slides/hueso-4/slide_files/0/0_0.jpg` -> HTTP 200 JPEG image.
- Attempt `/demo/slides/hueso-5/slide.dzi` or `/demo/slides/hueso-4/barcode.jpg` -> HTTP 404.
- When `DEMO_ENABLED` is false, guest endpoint must return 404 while private unauthenticated endpoint must return 401.

**If the actual Worker hostname differs**, update both `histology/slides/hueso-4.json` (descriptor URL) **and** the exact trusted origin constant in `histology/histology-poc.js` before deploying the website. Never send auth headers to arbitrary URLs.

## Stage 3 — Test locally before publishing
1. Extract the source ZIP so there is one parent folder.
2. In VS Code, open its parent project folder and start Live Server on port 5500 (127.0.0.1 or localhost).
3. Open `histology.html`, select the featured Hueso-4 **Online demo / No sign-in** card.
4. Confirm Hueso-4 loads with PMA.start completely closed; pan and zoom between levels; check navigator, responsive layout and page scrolling.
5. In a private/incognito browser window, repeat the same test **without logging in**.
6. Open `histology-poc.html?slide=hueso-4`, check Source Mode > Hosted, confirm neither a local PMA URL nor a local tile server is used.
7. View browser DevTools (F12) > Network and confirm tile requests use the Worker demo URL and return 200, not 401/403/404/CORS errors.
8. Optional protected-path test: use Developer setup with `https://morphora-histology-gateway.martin-fuentesvet.workers.dev/slides/hueso-4/slide.dzi` after signing into an account with UUID listed in ALLOWED_USER_IDS. Expect access. Sign out; test again, expect login required.

## Stage 4 — Publish for congress
After Cloudflare security and local browser tests PASS, back up the current GitHub repository version/commit and copy the **contents** of this source folder to your GitHub Pages repository root through GitHub Desktop. Do not publish `cloud-gateway/` containing the Worker internal source or the developer documents if unnecessary; if using a deployment pipeline, exclude those folders from your public build. Publish `index.html`, `histology.html`, `histology-poc.html`, `histology/*.js`, `histology/slides/hueso-4.json`, `release.json`, and required existing assets.

Check `https://morphora.cl/`, then `https://morphora.cl/histology.html` in incognito and on a phone using cellular data. Confirm no sign-in is required for the Hueso-4 demonstration.

## Stage 5 — After the congress
- Demo access automatically expires at 2026-10-17T03:00:00Z, **but also set** `DEMO_ENABLED=false` in Cloudflare.
- The public website still needs a follow-up deployment to remove the demo CTA or replace it with a permanent approved sample; don't leave a broken guest slide link live.
- Keep private `/slides/hueso-4/*` for authorized accounts; the underlying R2 bucket remains private.
- Monitor Worker request quotas and R2 Class B operation counts during the congress.

## Rollback
- If live tests fail: change `DEMO_ENABLED=false` first. This immediately disables new anonymous R2 reads, except brief browser caches.
- Restore the prior Worker source saved in Stage 1 and redeploy.
- Revert the GitHub Pages commit to v0.8.2 if the website experiences regressions.
- R2 upload and local Hueso-4 files are unchanged. Never use rclone sync/delete to roll back.

## Engineering verification
Run `node cloud-gateway/test-worker.mjs` (23 simulated cases) and `node tools/test_histology_hosted_source.js`. These are local checks, not proof that real Cloudflare/Supabase/browser flows work end-to-end. The original regression checks were updated for v0.8.3 version labels and the Hueso-4 hosted default; run `node tools/test_histology_poc.js` as well.
