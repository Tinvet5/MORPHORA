# MORPHORA V4.8.4 — Data model and schema guide

V4.8.4 establishes schema version **2** as the canonical format for atlas/editorial data and personal user data.

## Canonical atlas hierarchy

`catalog → species → collection → view → label`

Each JSON document carries `schemaVersion: 2`. Stable IDs use lowercase ASCII letters, numbers, and hyphens.

## View labels

Quiz metadata is now grouped under `quiz` rather than mixed into the label root:

```json
{
  "id": "infraorbital-foramen",
  "name": "Agujero Infraorbitario",
  "description": "...",
  "position": { "x": 0.655, "y": 0.36 },
  "category": "foramen",
  "status": "published",
  "quiz": {
    "eligible": true,
    "difficulty": "intermediate",
    "acceptedRadius": 0.035
  }
}
```

The runtime migration layer still accepts V1 labels with `quizEligible`, `difficulty`, and `acceptedRadius` at the label root. Studio exports only the V2 canonical format.

## Collection manifests

Collection manifests use the same identity fields:

```json
{
  "schemaVersion": 2,
  "id": "dog-skull",
  "speciesId": "dog",
  "systemId": "skeletal",
  "collectionId": "skull"
}
```

Legacy nested `species`/`region` fields are migrated in memory when older manifests are imported.

## Personal data

Annotations, drawings, and learning progress now use schema version 2 and new local-storage keys. V1 browser data is detected and copied into the V2 store automatically on first load.

## Runtime model API

`models.js` exposes `window.MorphoraModels` with:

- `prepare(kind, raw, context)` — migrate + validate.
- `migrate(kind, raw)` — convert older atlas data to the V2 canonical shape.
- `validate(kind, data, context)` — return `{ errors, warnings }`.
- `createView()`, `createLabel()`, `createCollectionEntry()` — shared builders.
- `getQuiz(label)` — compatibility accessor for quiz metadata.
- `migrateUserStore(kind, raw)` — user-data migration.

## Migration command

Preview migrations:

```bash
python tools/migrate_schema.py --check
```

Rewrite supported V1 atlas JSON files as V2:

```bash
python tools/migrate_schema.py --write
```

The command creates a timestamped backup before writing.

## JSON Schema files

Machine-readable documentation lives in `schemas/`. These schemas document the canonical format; the browser runtime and Python validator remain the enforcement points used by the application and CI.
