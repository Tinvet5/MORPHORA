# MORPHORA V4.8.6 Release Test Checklist

## Local validation

- [ ] `python -m pip install -r tools/requirements.txt` succeeds.
- [ ] `npm run check` completes with 0 errors.
- [ ] Only expected draft-content warnings remain.
- [ ] `npm run release:verify` creates and verifies `dist/`.
- [ ] `dist/` does not contain `tools/`, `source-images/`, `reports/` or `.github/`.
- [ ] `dist/release.json` has `validation: "passed"`.
- [ ] `dist/release-meta.js` contains the same asset version as `release.json`.

## Runtime smoke test

- [ ] Normal atlas opens through Live Server.
- [ ] Existing Deep Zoom views load and zoom.
- [ ] Labels, notes and drawing layer still work.
- [ ] Study and Quiz modes still open normally.
- [ ] Studio loads existing views.
- [ ] Studio publish preflight still works.
- [ ] Developer Diagnostics loads without console errors.
- [ ] Developer Diagnostics shows runtime/artifact release identity.

## GitHub setup

- [ ] Existing `CNAME` remains in repository root.
- [ ] GitHub Pages Source is changed to **GitHub Actions**.
- [ ] Repository Actions are enabled.
- [ ] `Deploy MORPHORA to GitHub Pages` appears in Actions.

## Production deployment

- [ ] Push to `main` starts the deploy workflow.
- [ ] Validation gate passes before Pages upload.
- [ ] Release artifact verification passes.
- [ ] Validation report artifact is available.
- [ ] Release metadata artifact is available.
- [ ] Deploy job runs only after build succeeds.
- [ ] `morphora.cl` serves the new version.
- [ ] `morphora.cl/release.json` identifies the deployed commit.
- [ ] `morphora.cl/dev-tools.html` shows **Matched**.

## Failure gate test (recommended once)

On a temporary branch / pull request, deliberately introduce an invalid duplicate label or bad schema value and confirm validation fails. Do not merge the intentional error. This proves the gate catches content problems before deployment.

## Rollback test (optional)

- [ ] Record a known-good V4.8.6+ commit SHA.
- [ ] Manually run the deploy workflow with that SHA.
- [ ] Confirm the workflow validates it before redeployment.
