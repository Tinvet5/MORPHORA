# MORPHORA V4.8.6 Deployment & Release Guide

## First installation

1. Back up the current MORPHORA repository.
2. Copy the contents of the V4.8.6 package into the local GitHub Desktop repository.
3. Preserve the existing `CNAME` file (`morphora.cl`).
4. In VS Code run:

```bash
python -m pip install -r tools/requirements.txt
npm run ci
```

5. Preview `index.html`, `studio.html`, and `dev-tools.html` with Live Server.
6. Commit the changes in GitHub Desktop.
7. Push origin.
8. In GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
9. Open the **Actions** tab and confirm `Deploy MORPHORA to GitHub Pages` succeeds.
10. Open `https://morphora.cl/dev-tools.html` and confirm the release identity shows **Matched**.

## Normal release workflow

```text
Edit locally
→ npm run check
→ Live Server smoke test
→ GitHub Desktop: review changes
→ Commit
→ Push origin
→ GitHub Actions validates
→ GitHub Actions builds dist/
→ GitHub Actions verifies dist/
→ GitHub Pages deploys
```

The live website changes only after the deployment job succeeds.

## What happens when validation fails

The build job stops. The Pages artifact is never uploaded and the deploy job is skipped. The last successful deployment remains live.

Open the failed Actions run and inspect the console output or download the `morphora-validation-*` artifact.

## Release artifact anatomy

A deployment contains only runtime files. In particular, `source-images/`, tooling, local reports and safety backups are not included.

`release.json` records exactly which commit produced the deployment. `release-meta.js` exposes the same data to the app and service worker before normal runtime configuration loads.

## Rollback / redeploy

For a known-good V4.8.6+ commit:

1. GitHub → Actions.
2. Open **Deploy MORPHORA to GitHub Pages**.
3. Select **Run workflow**.
4. Enter the known-good branch, tag, or commit SHA in `ref`.
5. Run the workflow.

The old commit must still pass its own validation and release build before it can replace production.

For older pre-V4.8.6 commits, revert the repository to the desired state first, then deploy the resulting V4.8.6-compatible tree.

## Custom domain

The deployment builder copies `CNAME` when the file exists at repository root. Do not delete it during upgrades.

If the custom domain ever stops resolving after changing Pages settings, re-check:

- Repository → Settings → Pages → Custom domain = `morphora.cl`
- DNS records at NIC Chile
- `CNAME` file in repository root

## Cache checks

A production release should have a release key similar to:

```text
4.8.6-3af7c21b
```

Developer Diagnostics should show the same key/commit between runtime and artifact metadata. A normal hard refresh is usually sufficient after the first Actions-based deployment.
