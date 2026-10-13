# MORPHORA V4.9.3 — Navigation & Search Refinement

V4.9.3 is a focused usability refinement built directly on V4.9.2. It preserves the V4.9 performance engine, Deep Zoom delivery, Content Studio, V2 schemas, Study/Quiz, drawings, notes, validation, and validation-gated deployment architecture.

## 1. Cleaner species hub

The species page now uses a quieter hierarchy:

- the species hero is shorter and more compact;
- species statistics are presented as lightweight inline metadata;
- anatomical systems are compact filter pills instead of large cards;
- an **All systems** control restores the full collection list;
- available anatomy is visually prioritized;
- coming-soon collections are condensed into smaller roadmap cards instead of occupying the same visual weight as published content.

No species or collection JSON schema changes were required.

## 2. Contextual Atlas Tools

The permanent V4.9.2 desktop control dock has been replaced by a small **Atlas tools** launcher.

At desktop widths, the launcher sits at the upper-left of the viewer. Selecting it opens a frosted contextual panel containing the same viewer, view, learning, and personal-study controls. Closing the panel gives the specimen the full workspace again.

Mobile retains the existing bottom toolbar and compact control model.

## 3. Live anatomical-label suggestions

The atlas label search now behaves as an autocomplete field.

As the user types, MORPHORA shows up to seven matching labels from the current anatomical view. Matches beginning with the typed text are prioritized.

Supported interactions:

- pointer/touch selection;
- Arrow Up / Arrow Down navigation;
- Enter to choose the active suggestion;
- Escape to dismiss suggestions.

Selecting a suggestion:

1. applies the exact label filter;
2. ensures labels are visible;
3. pans and zooms to the anatomical anchor;
4. closes the tools panel;
5. opens the structure-information inspector.

The search remains intentionally scoped to the current view. Global atlas/library search remains a separate feature.

## 4. Packaging correction

The release ZIP is packaged with a single top-level directory:

```text
MORPHORA-V4.9.3-Navigation-Search-Refinement/
├── index.html
├── design-system.css
├── script.js
├── navigation.js
├── data/
├── tiles/
├── studio/
└── ...
```

Extracting the ZIP therefore creates one clean MORPHORA project folder rather than scattering repository files directly into the extraction destination.

## Local preview

Use Live Server:

```text
http://127.0.0.1:5500/
http://127.0.0.1:5500/studio.html
http://127.0.0.1:5500/dev-tools.html
http://127.0.0.1:5500/performance-lab.html
```

Recommended V4.9.3 smoke test:

1. Open Dog from the species library.
2. Switch between **All systems** and **Skeletal system**.
3. Confirm the skull collection remains visually primary and planned collections are compact.
4. Open the skull atlas.
5. Confirm no permanent desktop sidebar is visible.
6. Open and close **Atlas tools**.
7. Type part of a label name in Search.
8. Use mouse and keyboard to choose suggestions.
9. Confirm the viewer focuses the chosen label and opens its information.
10. Confirm Study, Quiz, Notes, Draw, Studio, and Deep Zoom still operate normally.

## Validation

Run:

```bash
npm run ci
```

V4.9.3 is expected to complete with zero errors and the existing warning for the intentionally absent canine cervical starter photograph.
