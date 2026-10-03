# MORPHORA atlas data — schema V2

MORPHORA keeps application code, navigation metadata, image metadata and anatomical labels separate.

## Hierarchy

```text
Catalog → Species → System → Collection manifest → View JSON → Image + labels
```

Every canonical atlas JSON document uses:

```json
"schemaVersion": 2
```

V4.8.4 can still read supported V1 atlas files through the runtime migration layer, but Studio exports and repository data should use V2.

## One view per photograph

Each photograph has one view JSON file. Deep Zoom and standard images share the same view model:

```json
{
  "schemaVersion": 2,
  "id": "dog-skull-lateral",
  "title": "Canine skull — lateral view",
  "orientation": "lateral",
  "status": "published",
  "image": {
    "type": "dzi",
    "src": "tiles/dog-skull-lateral/dog-skull-lateral.dzi",
    "fallback": "images/lateral.jpg",
    "thumbnail": "images/thumbnails/views/dog-skull-lateral.webp",
    "width": 6000,
    "height": 4000,
    "alt": "Lateral view of a canine skull"
  },
  "labels": []
}
```

## Labels and quiz metadata

Quiz settings are grouped under `quiz` in schema V2:

```json
{
  "id": "infraorbital-foramen",
  "name": "Agujero Infraorbitario",
  "description": "...",
  "position": { "x": 0.655, "y": 0.36 },
  "labelPosition": { "x": 0.72, "y": 0.32 },
  "category": "foramen",
  "status": "published",
  "quiz": {
    "eligible": true,
    "difficulty": "intermediate",
    "acceptedRadius": 0.035
  }
}
```

`position` is the anatomical anchor. `labelPosition` is the optional text-box center. Both use normalized coordinates from `0` to `1`.

Legacy V1 label fields (`quizEligible`, `difficulty`, `acceptedRadius`) are migrated automatically when imported, but are not written by V4.8.4 Studio.

## Collection manifests

Collection identity is standardized:

```json
{
  "schemaVersion": 2,
  "id": "dog-skull",
  "speciesId": "dog",
  "systemId": "skeletal",
  "collectionId": "skull"
}
```

## Development commands

Check whether repository JSON is already canonical V2:

```bash
npm run schema:check
```

Migrate supported V1 files with an automatic local backup:

```bash
npm run schema:migrate
```

Run all syntax, model, static, schema and atlas checks:

```bash
npm run check
```

See `SCHEMA-GUIDE-V4.8.4.md` and `schemas/` for the full data contract.


## V4.9.6 authored question banks

Collection-level knowledge questions live under `data/questions/`. The bank filename mirrors the collection manifest filename, for example `data/collections/dog-skull.json` -> `data/questions/dog-skull.json`. These questions are optional and do not alter view or label schemas.
