# MORPHORA V4.8.6 — Deployment & Release Automation

V4.8.6 closes the V4.8 technical-hardening cycle by moving production deployment behind the same validation gate introduced in V4.8.5.

## What changes

The repository is still edited locally and pushed with GitHub Desktop, but `main` is no longer intended to be served directly by GitHub Pages. A GitHub Actions workflow now validates the selected commit, builds a clean static deployment artifact, verifies that artifact, and only then publishes it.

```text
Studio / local edits
→ npm run check
→ GitHub Desktop commit + push
→ GitHub Actions validation gate
→ release artifact build
→ artifact verification
→ GitHub Pages deployment
→ morphora.cl
```

If validation or release verification fails, the deploy job never runs and the previously deployed website remains in place.

## New release metadata

V4.8.6 adds two runtime files:

- `release-meta.js` — loaded before `app-config.js` so the app and service worker know the current release identity.
- `release.json` — human- and machine-readable release metadata used by Developer Diagnostics.

A production build generates metadata similar to:

```json
{
  "product": "MORPHORA",
  "version": "4.8.6",
  "schemaVersion": 2,
  "assetVersion": "4.8.6-a1b2c3d4",
  "commit": "a1b2c3d4...",
  "shortCommit": "a1b2c3d4",
  "validation": "passed",
  "deploymentTarget": "github-pages"
}
```

`assetVersion` combines the semantic application version with the exact Git commit. This gives every validated deployment a unique browser-cache identity even when multiple patches are shipped under the same semantic version.

## New release commands

Run the normal project validation:

```bash
npm run check
```

Build the deployment artifact after validation:

```bash
npm run build:release
```

Verify the generated artifact:

```bash
npm run check:release
```

Run both build and artifact verification:

```bash
npm run release:verify
```

Run the complete CI-equivalent sequence locally:

```bash
npm run ci
```

The generated deployment site lives in `dist/`. That folder is ignored by Git and should not be committed.

## What goes into `dist/`

Only runtime material is copied to the deployment artifact: the student atlas, Studio, diagnostics, app JavaScript/CSS, schemas, branding, atlas data, images, tiles and runtime validation rules.

Development-only material is deliberately excluded, including:

- `tools/`
- `source-images/`
- `reports/`
- `.github/`
- `.morphora-backups/`
- `node_modules/`

This keeps production cleaner and prevents source photography or developer artifacts from being published accidentally.

## GitHub workflows

### Pull requests / manual validation

`.github/workflows/validate-atlas.yml`

Runs validation and creates a downloadable preview-site artifact, but does not publish it.

### Production deployment

`.github/workflows/deploy-pages.yml`

On a push to `main` or `master`:

1. Checks out the commit.
2. Installs validation dependencies.
3. Runs `npm run check`.
4. Generates exact commit metadata.
5. Runs `npm run release:verify`.
6. Uploads validation and release metadata artifacts.
7. Uploads the clean `dist/` Pages artifact.
8. Deploys only if every previous step passed.

## One-time GitHub Pages setting

After installing V4.8.6, open the repository on GitHub and go to:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

This is essential. If Pages remains configured to deploy directly from the `main` branch, a branch push can bypass the new deployment gate.

Keep the existing root `CNAME` file containing `morphora.cl`. The release builder automatically includes it when it is present in the repository.

## Cache hardening

The service worker now keys caches to the exact release asset version instead of only `4.8.6`.

For example:

```text
morphora-shell-4.8.6-a1b2c3d4
morphora-runtime-4.8.6-a1b2c3d4
morphora-data-4.8.6-a1b2c3d4
```

The release builder also injects the same commit-aware asset version into local CSS/JS query parameters in the deployment HTML.

This greatly reduces stale-version problems after a deployment.

## Developer Diagnostics

`dev-tools.html` now shows the runtime release and the generated deployment artifact release side by side, including:

- semantic version
- short Git commit
- validation state
- deployment target
- build timestamp
- link to the originating GitHub Actions run when available

A healthy production build should show **Matched**.

## Manual deployment / rollback

The production workflow supports **Run workflow** from the GitHub Actions interface. You can supply a branch, tag or commit in the `ref` field.

This provides a controlled redeployment/rollback path for V4.8.6-and-newer releases:

```text
Actions
→ Deploy MORPHORA to GitHub Pages
→ Run workflow
→ ref: known-good tag/commit
→ Run workflow
```

The selected ref is still validated before deployment. For versions older than V4.8.6, use a normal Git revert or restore the older repository state because they do not contain the new release builder.

## Local preview

Live Server remains the preferred development preview:

```text
http://127.0.0.1:5500/
http://127.0.0.1:5500/studio.html
http://127.0.0.1:5500/dev-tools.html
```

For the exact deployment artifact, first run:

```bash
npm run release:verify
```

and serve the generated `dist/` directory with an HTTP server.

## V4.8.6 scope

No new anatomy-learning mode is introduced. Study, Quiz, annotations, drawings, Deep Zoom and Studio content authoring remain compatible with V4.8.5. The release focuses on safe production deployment, reproducible artifacts, release identity, caching and rollback readiness.
