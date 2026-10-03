# MORPHORA V4.9.7 — Multilingual Content Guide

## Core rule

Translations change text, not anatomy.

Never create a second hotspot, second label ID or second view merely because a translation is required. A single stable anatomical entity should carry localized text.

## Label format

Preferred V4.9.7 shape:

```json
{
  "id": "infraorbital-foramen",
  "name": "Agujero infraorbitario",
  "description": "Descripción de origen.",
  "translations": {
    "es": {
      "name": "Agujero infraorbitario",
      "description": "Descripción de origen.",
      "aliases": ["Foramen infraorbitario"]
    },
    "en": {
      "name": "Infraorbital foramen",
      "description": "English description.",
      "aliases": []
    }
  },
  "terminology": {
    "latin": "Foramen infraorbitale"
  }
}
```

The legacy `name` and `description` fields remain because V4.9.7 is intentionally backwards-compatible with the existing V2 model.

## Fields that are translated

Translate only language-dependent content, such as:

- display name;
- description;
- aliases/search synonyms;
- collection/species/system display copy;
- authored-question prompt, options and explanation.

## Fields that remain shared

Do **not** duplicate or translate:

- `id`;
- anchor coordinates;
- label coordinates;
- image/DZI source paths;
- category identifiers;
- quiz eligibility;
- accepted radius;
- difficulty identifiers;
- publication state;
- view/collection/species IDs.

## Aliases

Aliases are search terms, not replacement display names. Add only useful terminology that a student may reasonably type.

Example:

```json
"es": {
  "name": "Agujero infraorbitario",
  "aliases": ["Foramen infraorbitario"]
}
```

Avoid adding spelling mistakes as permanent aliases unless there is a clear educational reason.

## Latin terminology

When standardized Latin nomenclature is available, use:

```json
"terminology": {
  "latin": "Foramen infraorbitale"
}
```

Latin terminology is optional and does not replace the localized display name.

## Studio workflow

For an existing structure:

1. Select the anatomical label.
2. Confirm the permanent ID before editing.
3. Choose **Español** or **English** in the content-language selector.
4. Edit localized name, description and aliases.
5. Check the translation-status indicators.
6. Do not reposition the anchor/label unless the anatomical placement itself needs correction.
7. Run validation before publishing.

Spanish is the current source locale. Editing the Spanish source name/description keeps the legacy V2 fields synchronized.

## Authored knowledge questions

Questions may preserve legacy fields and add localized blocks:

```json
{
  "id": "example-question",
  "type": "multiple-choice",
  "prompt": "Which structure is indicated?",
  "options": ["A", "B", "C", "D"],
  "correctIndex": 0,
  "translations": {
    "es": {
      "prompt": "¿Qué estructura se indica?",
      "options": ["A", "B", "C", "D"],
      "explanation": "..."
    },
    "en": {
      "prompt": "Which structure is indicated?",
      "options": ["A", "B", "C", "D"],
      "explanation": "..."
    }
  }
}
```

Keep the logical answer index identical across translations. If option order is changed in one locale, update the translated question carefully so `correctIndex` still identifies the same answer concept.

## Missing translations

Do not create duplicate entities to work around a missing translation. Leave the locale field incomplete and allow MORPHORA's fallback behavior to keep the content usable until editorial translation is complete.

For future languages, the intended workflow is to register the locale, add the UI dictionary, then progressively populate content translations. The anatomical backend should remain unchanged.
