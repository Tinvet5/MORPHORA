# MORPHORA V4.8.5 — Automated Validation & Developer Tooling

V4.8.5 turns the V4.8.4 schema system into an enforceable project-health layer. The student-facing atlas is intentionally unchanged; the release focuses on preventing broken content, missing assets and inconsistent metadata from reaching production.

## Core additions

### 1. One authoritative project validator

Run:

```bash
npm run check
```

The full check now covers:

- JavaScript syntax.
- Data-model migrations.
- Shared browser validation rules.
- HTML/ARIA/static references.
- JSON Schema conformance.
- Schema migration status.
- Catalog → species → collection → view traversal.
- Duplicate species/system/collection/view/label IDs.
- Duplicate view JSON paths and manifest registrations.
- Unsafe repository paths.
- Published-content readiness.
- Image existence and declared dimensions.
- Deep Zoom descriptors, expected pyramid levels and tile files.
- Thumbnail and fallback requirements for published views.
- Quiz metadata and coordinate ranges.
- App/package/service-worker version consistency.

The authoritative validator is:

```text
tools/validate_project.py
```

Use it directly with:

```bash
npm run validate:project
```

### 2. Actionable validation messages

Validation issues now use stable codes, severity, source path and optional repair hints.

Example:

```text
✗ QUIZ_RADIUS [data/views/dog-skull-lateral.json · labels[2].quiz.acceptedRadius]
  Quiz accepted radius must be between 0.005 and 0.2.
  → Typical values are 0.025–0.075.
```

Severity levels are:

```text
PASS     completed health check
WARNING  review item; does not fail the build
ERROR    blocker; npm run check exits with failure
```

### 3. Published content has stricter rules

Draft and coming-soon content may be incomplete.

A view that is both:

- inside an available collection, and
- marked `published`

must have valid production assets and metadata.

Published views therefore require:

- valid view schema.
- image source.
- image alternative text.
- view thumbnail.
- DZI fallback when using Deep Zoom.
- complete DZI pyramid when applicable.
- valid coordinates and quiz metadata.

Missing assets in draft/coming-soon content are warnings instead of deployment-blocking errors.

### 4. Image metadata verification

Normal image views are opened with Pillow and compared against the width/height stored in the view JSON.

A mismatch produces a warning such as:

```text
IMAGE_DIMENSIONS_MISMATCH
Declared dimensions 6000×4000 do not match file dimensions 5000×3333.
```

This is useful after replacing photographs through Studio.

### 5. Deep Zoom integrity checking

For every DZI view the validator checks:

- descriptor exists and parses.
- tile size, overlap and format are valid.
- descriptor dimensions match view JSON.
- tile directory exists.
- expected pyramid levels exist.
- expected tile files exist.
- tile count is plausible.
- fallback image exists for published views.
- thumbnail exists for published views.

### 6. Shared Studio validation rules

The new browser validation module is:

```text
validation/rules.js
```

Studio now uses it during normal validation and Publish Preflight, so the editor catches the same classes of problems that the command-line tooling enforces.

This reduces the chance of a view passing Studio but failing later in the repository validator.

### 7. Developer Diagnostics page

Open through Live Server:

```text
http://127.0.0.1:5500/dev-tools.html
```

or use **Open developer diagnostics** in Studio.

The page performs a read-only browser traversal of the live project graph and shows:

- app version.
- species count.
- collection count.
- view count.
- label count.
- errors.
- warnings.
- model/schema problems.
- missing fetchable assets.

When `npm run check` has been run locally, the page also reads:

```text
reports/validation-report.json
```

and displays the authoritative CLI summary.

The diagnostics page is marked `noindex,nofollow` and is not linked from the student atlas.

### 8. Machine-readable validation reports

`npm run validate:project` writes:

```text
reports/validation-report.json
reports/validation-report.txt
```

The `reports/` directory is ignored by Git except for its placeholder, so local reports do not create GitHub Desktop noise.

The JSON report can later feed deployment automation or developer dashboards.

### 9. Stronger GitHub Actions validation

`.github/workflows/validate-atlas.yml` now:

- installs Python validator dependencies.
- uses Node 22.
- runs the exact `npm run check` command used locally.
- uploads the generated validation report as a workflow artifact, even if validation fails.

A failed validation job gives a visible red GitHub Actions check.

Important: if GitHub Pages is still configured to publish directly from the `main` branch, this validation job cannot technically stop GitHub Pages from serving a direct push. V4.8.6 will move deployment itself behind the validated workflow. Until then, review the Actions result before treating a push as a production release.

### 10. Version consistency checks

The validator verifies that the active release version agrees across:

- `app-config.js`
- `package.json`
- `index.html` asset cache query strings
- `studio.html` asset cache query strings
- `dev-tools.html` asset cache query strings
- service-worker fallback version

This reduces stale-cache bugs caused by updating only some version references.

## Small content cleanup included

The starter canine C1 dorsal view is now explicitly:

```json
"status": "draft"
```

and declares:

```json
"image": {
  "type": "image"
}
```

Its photograph is still intentionally absent. Because the cervical collection is coming soon, that remains one expected validation warning rather than an error.

## Installation

1. Back up the current local MORPHORA repository.
2. Copy the contents of the V4.8.5 package into the repository root.
3. Keep the existing `CNAME` file containing `morphora.cl`.
4. Install validator requirements if needed:

```bash
python -m pip install -r tools/requirements.txt
```

5. Run:

```bash
npm run check
```

6. Preview with Live Server:

```text
/
/studio.html
/dev-tools.html
```

7. Review changes in GitHub Desktop.
8. Commit and push.
9. Check the **Validate MORPHORA project** workflow in GitHub Actions.
10. Hard-refresh the deployed app once after the V4.8.5 service worker is live.

## Main new files

```text
validation/rules.js
dev-tools.html
dev-tools.css
dev-tools.js
tools/validation_core.py
tools/validate_project.py
tools/test_validation.js
DEVELOPER-VALIDATION-GUIDE-V4.8.5.md
VALIDATION-TEST-CHECKLIST-V4.8.5.md
```

## Release validation result

At packaging time:

```text
0 errors
1 expected warning
```

The warning is the intentionally absent photograph for the draft canine C1 dorsal view in the coming-soon cervical collection.
