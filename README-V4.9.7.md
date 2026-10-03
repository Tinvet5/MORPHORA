# MORPHORA V4.9.7 — Content Discovery & Multilingual Foundation

V4.9.7 adds the first production-ready multilingual/content-discovery layer to MORPHORA while preserving the existing anatomical data model, Deep Zoom viewer, Study/Quiz engine, personal data, Studio pipeline and deployment architecture.

## Release goals

- Keep one canonical anatomical atlas with stable IDs and coordinates.
- Render language-specific text without duplicating views or hotspots.
- Provide live Spanish/English switching with a persisted preference.
- Make search language-aware, alias-aware and terminology-aware.
- Allow Studio editors to author translations without touching structural anatomy metadata.
- Preserve V2 schema compatibility and legacy content fields during migration.

## New multilingual runtime

The new `i18n/` directory contains:

- `language-manager.js` — locale selection, translation lookup, content localization, fallback handling, live switching and DOM translation.
- `es.json` — Spanish public-interface dictionary.
- `en.json` — English public-interface dictionary.

MORPHORA currently registers `es` and `en`. The source locale is Spanish and the configured fallback locale is English.

The language selector in the public header switches the current interface without reloading the atlas. The user's explicit language choice is stored through the V4.9.5 persistence layer and overrides browser-language detection on later visits.

## One anatomical entity, multiple languages

Anatomical geometry remains shared. A label can now carry additive localized text:

```json
{
  "id": "infraorbital-foramen",
  "translations": {
    "es": {
      "name": "Agujero infraorbitario",
      "description": "...",
      "aliases": ["Foramen infraorbitario"]
    },
    "en": {
      "name": "Infraorbital foramen",
      "description": "...",
      "aliases": []
    }
  },
  "terminology": {
    "latin": "Foramen infraorbitale"
  },
  "position": {
    "x": 0.5,
    "y": 0.5
  }
}
```

The `id`, coordinates, label position, category, publication state and quiz metadata remain language-independent.

Legacy `name` and `description` fields remain valid and are retained for backwards compatibility. Existing V2 content therefore does not require a disruptive migration.

## First bilingual reference collection

The Dog Skull collection is the V4.9.7 reference implementation:

- 5 published skull views have bilingual view titles/button labels.
- 12 current anatomical labels contain Spanish and English translation blocks.
- Alias arrays are supported for localized search.
- Optional Latin terminology can be indexed without replacing localized display names.

Existing placeholder descriptions were preserved rather than replaced with newly invented theoretical content.

## Content Discovery

Global library search now indexes available anatomical structures in addition to species, systems, collections and views.

A structure can be discovered using:

- the current localized name;
- localized aliases;
- names from supported locales;
- optional Latin terminology.

Selecting a structure result opens the correct anatomical view and focuses the existing hotspot. Search therefore resolves to stable structure/view IDs rather than duplicated language-specific entities.

The in-view atlas search remains optimized for the currently displayed specimen and continues to pan/zoom to the selected label.

## Study & Quiz localization

The V4.9.6 engine remains structurally unchanged. Automatic questions continue to target stable label IDs, while the renderer uses the active localized label text.

Collection-level authored question banks can now optionally include `translations.es` and `translations.en` for prompts, answers and explanations. Existing legacy question fields remain compatible.

The current Dog Skull authored-question bank is intentionally empty; V4.9.7 adds multilingual support but does not invent theoretical questions.

## Studio translation authoring

The label inspector now includes a content-language selector for Español and English.

Editors can maintain per-language:

- structure name;
- description;
- search aliases.

Studio also displays translation-completion status for the selected label. Shared fields — ID, coordinates, category, publication state and quiz metadata — remain common to all languages.

When the Spanish source translation is edited, legacy `name` and `description` fields are kept synchronized for backwards compatibility.

Studio's developer interface itself remains primarily English in V4.9.7; multilingual authoring support is the focus of this release.

## Fallback behavior

The language manager resolves localized content safely. If a requested localized field is unavailable, it can use configured fallback/legacy content instead of allowing the anatomical entity to disappear.

This means incomplete future translations can be introduced progressively without requiring duplicate atlas data.

## Schema and compatibility

The canonical schema remains **V2**.

Translation and terminology fields are optional additions to the existing schemas for catalogs, species, collections, views and question banks. Existing V2 JSON remains loadable.

No migration is required for:

- notes;
- drawings;
- learning progress;
- quiz recovery;
- label coordinates;
- Deep Zoom sources;
- Studio drafts.

## Developer checks

V4.9.7 adds:

```bash
npm run check:i18n
```

The i18n test verifies matching ES/EN UI dictionary keys and bilingual Dog Skull content. The normal `npm run check` includes this test automatically.

## Validation snapshot

At release verification:

- 0 validation errors
- 1 expected warning: missing starter photograph for `dog-cervical-c1-dorsal`
- 1 species
- 2 collection manifests
- 6 views traversed
- 12 labels
- 1 custom question bank / 0 authored questions
- 2,605 Deep Zoom tiles
- 6.97 MiB Deep Zoom tile footprint
- 0 performance warnings

## Local testing

Use Live Server:

```text
http://127.0.0.1:5500/
http://127.0.0.1:5500/studio.html
http://127.0.0.1:5500/dev-tools.html
```

Recommended smoke test:

1. Open Dog → Skull → Lateral.
2. Switch ES → EN from the header and verify the current view updates without a reload.
3. Switch back to ES and confirm the preference persists after refresh.
4. Search the global library for an English, Spanish and alias form of a structure.
5. Select a global structure result and verify MORPHORA opens/focuses the correct hotspot.
6. Open Study/Quiz and confirm the current localized structure names are used.
7. Open Studio, select a label, switch the content-language editor between ES/EN, edit an alias and verify the structural coordinates do not change.
8. Run `npm run check` before deployment.

## Deployment

Copy the V4.9.7 project contents over the existing GitHub Desktop working copy, **preserving the repository's existing `CNAME`**. Review changes, commit to `main`, push, then verify the GitHub Actions deployment gate.
