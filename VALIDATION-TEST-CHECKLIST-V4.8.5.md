# MORPHORA V4.8.5 — Validation & Developer Tooling Test Checklist

## Command line

- [ ] `python -m pip install -r tools/requirements.txt` succeeds.
- [ ] `npm run check` completes with 0 errors.
- [ ] Expected cervical draft image warning is shown.
- [ ] `reports/validation-report.json` is created.
- [ ] `reports/validation-report.txt` is created.

## Intentional failure tests

Use a disposable copy of the project and restore each file afterward.

- [ ] Duplicate a label ID and confirm `DUPLICATE_LABEL_ID` fails validation.
- [ ] Set `quiz.acceptedRadius` to `0.5` and confirm `QUIZ_RADIUS` fails validation.
- [ ] Change a published view thumbnail path to a missing file and confirm validation fails.
- [ ] Change one coordinate to `1.5` and confirm validation fails.
- [ ] Change a view `dataPath` to `../outside.json` and confirm unsafe-path validation fails.
- [ ] Remove one DZI tile and confirm `DZI_TILES_MISSING` fails validation.
- [ ] Change one `?v=4.8.5` asset reference to an older version and confirm version validation fails.

## Studio

- [ ] Open `/studio.html` with Live Server.
- [ ] Existing views load normally.
- [ ] Validation badge works.
- [ ] Publish Preflight still works.
- [ ] Invalid quiz radius appears before export/publish.
- [ ] Unsafe repository paths are blocked.
- [ ] **Open developer diagnostics** opens `/dev-tools.html`.

## Developer Diagnostics

- [ ] `/dev-tools.html` loads through Live Server.
- [ ] App version displays 4.8.5.
- [ ] Runtime species/collection/view/label counts populate.
- [ ] Expected cervical missing-image warning appears.
- [ ] No unexpected errors appear.
- [ ] After running `npm run check`, CLI report summary loads after refresh.

## GitHub

- [ ] Commit and push with GitHub Desktop.
- [ ] **Validate MORPHORA project** workflow runs.
- [ ] Workflow installs Python dependencies.
- [ ] `npm run check` succeeds.
- [ ] Validation-report artifact is available from the workflow run.
