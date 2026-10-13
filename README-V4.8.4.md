# MORPHORA V4.8.4 — Data Model & Schema Cleanup

V4.8.4 formalizes the data layer that powers the atlas, Studio, quizzes, personal notes, drawings and progress tracking. It intentionally makes very few visible changes to the student app; the goal is safer data, predictable migrations and cleaner future development.

## Core changes

### 1. Canonical schema version 2

All repository atlas JSON now uses `schemaVersion: 2`:

- `data/catalog.json`
- `data/species/*.json`
- `data/collections/*.json`
- `data/views/*.json`

The application version is `4.8.4`.

### 2. Centralized model layer

A new root file, `models.js`, defines the shared model rules used by the public atlas, navigation and Content Studio.

It provides:

- `prepare(kind, raw, context)` — migrate + validate.
- `migrate(kind, raw)` — convert supported older data to V2.
- `validate(kind, data, context)` — centralized validation.
- `createView()` / `createLabel()` / `createCollectionEntry()` — shared builders.
- `getQuiz(label)` — quiz compatibility accessor.
- `migrateUserStore(kind, raw)` — personal-data migration.

This prevents Studio, the student app and tooling from independently inventing slightly different rules for the same data.

### 3. Quiz metadata is grouped

V1 labels stored quiz fields at the label root:

```json
{
  "quizEligible": true,
  "difficulty": "intermediate",
  "acceptedRadius": 0.035
}
```

V2 writes:

```json
{
  "quiz": {
    "eligible": true,
    "difficulty": "intermediate",
    "acceptedRadius": 0.035
  }
}
```

The runtime still accepts supported V1 labels. Non-enumerable compatibility aliases let existing Study/Quiz and Studio code continue reading the older property names internally while all exports remain canonical V2 JSON.

### 4. Standardized collection identity

Collection manifests now consistently use:

```json
{
  "id": "dog-skull",
  "speciesId": "dog",
  "systemId": "skeletal",
  "collectionId": "skull"
}
```

The older skull-specific nested `species` and `region` shape is migrated automatically when encountered.

### 5. Studio canonical export

Studio can import supported V1 or V2 view JSON, but `Export JSON` and direct project-folder publishing now write only V2 data.

The direct-publish collection manifest is also normalized through the shared model layer before it is written to disk.

### 6. Personal data migration

Local browser data now uses schema V2 and new keys:

```text
morphora:annotations:v2
morphora:drawings:v2
morphora:learning-progress:v2
```

On first load, V4.8.4 checks the V1 keys. Existing notes, drawings and learning progress are normalized and copied into the V2 stores automatically.

The old V1 keys are left untouched as an additional recovery path.

### 7. Machine-readable schema documentation

The new `schemas/` directory contains JSON Schema 2020-12 documents for:

- catalog
- species
- collection manifests
- views and labels
- annotations
- drawings
- learning progress

See `SCHEMA-GUIDE-V4.8.4.md` for the human-readable version.

### 8. Schema migration command

Check whether repository JSON is canonical V2:

```bash
npm run schema:check
```

Migrate supported V1 atlas files:

```bash
npm run schema:migrate
```

The write command creates a timestamped backup under `.morphora-backups/` before changing files.

### 9. Stronger automated checks

`npm run check` now runs:

```text
JavaScript syntax
→ model migration tests
→ HTML/static checks
→ JSON Schema document checks
→ schema migration check
→ full atlas/asset validation
```

The CI workflow also runs the model tests.

## What students will notice

Almost nothing should visually change. Study, Quiz, drawings, annotations, Deep Zoom and navigation behave as before.

This is deliberate: V4.8.4 is an architecture release.

## Installation

1. Back up the current local MORPHORA repository.
2. Copy the contents of the V4.8.4 package into the repository root.
3. Preserve the existing `CNAME` file containing `morphora.cl`.
4. Run:

```bash
npm run check
```

5. Preview `index.html` and `studio.html` through Live Server.
6. Review the changes in GitHub Desktop.
7. Commit and push when ready.
8. Hard-refresh the deployed site once after the new service worker/version is live.

## Important compatibility behavior

- Supported V1 atlas documents are migrated in memory.
- V2 is the only format written by the new Studio/tooling.
- Schema versions newer than V2 are rejected rather than silently interpreted.
- Existing V1 browser notes/drawings/progress are migrated automatically.

## Main new files

```text
models.js
schemas/
SCHEMA-GUIDE-V4.8.4.md
tools/migrate_schema.py
tools/test_models.js
```

## Validation result

At release packaging time:

```text
0 errors
1 expected warning
```

The warning is the intentionally missing canine cervical photograph in the coming-soon collection.
