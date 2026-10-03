# MORPHORA V4.8.4 — Data schema test checklist

## Repository data

- [ ] `data/catalog.json` has `schemaVersion: 2`.
- [ ] Species files have `schemaVersion: 2`.
- [ ] Collection manifests have `speciesId`, `systemId`, and `collectionId`.
- [ ] View files have `schemaVersion: 2` and a view `status`.
- [ ] Labels use a nested `quiz` object.
- [ ] No canonical V2 label contains root-level `quizEligible`, `difficulty`, or `acceptedRadius`.

## Public atlas

- [ ] Species navigation loads normally.
- [ ] Canine skull collection opens.
- [ ] All five skull views load.
- [ ] Labels render and descriptions open.
- [ ] Study mode works.
- [ ] Locate quiz accepts the configured radius.
- [ ] Multiple-choice/flashcards still work.

## Personal data migration

With V1 data already present in the browser:

- [ ] Existing notes appear after V4.8.4 loads.
- [ ] `morphora:annotations:v2` is created.
- [ ] Existing drawings appear.
- [ ] `morphora:drawings:v2` is created.
- [ ] Existing learning progress appears.
- [ ] `morphora:learning-progress:v2` is created.
- [ ] V1 keys remain available as a fallback.

## Studio

- [ ] Existing V2 views load.
- [ ] A V1 view JSON can be imported.
- [ ] Inspector quiz controls show the migrated values.
- [ ] Exported JSON contains nested `quiz` objects.
- [ ] Exported JSON contains `schemaVersion: 2`.
- [ ] Direct publish writes a V2 collection manifest.
- [ ] New image views start as `status: draft`.
- [ ] Publish preflight still works.

## Developer checks

```bash
npm run check
```

Expected result for the current package: 0 errors and 1 expected missing-cervical-image warning.
