# MORPHORA V4.9.2 — Design System & Visual Overhaul

V4.9.2 is a visual architecture release built on the validated V4.9 performance engine. It changes the public interface without changing MORPHORA's atlas data model, Deep Zoom pipeline, Study/Quiz engine, notes, drawings, schemas, validation, Studio publishing workflow, or GitHub deployment gate.

## Visual direction

The redesign follows one rule: **the anatomical specimen is the primary object; the interface supports it rather than competing with it.**

The official navy/teal MORPHORA identity remains intact. The interface now uses quieter surfaces, more whitespace, fewer decorative effects, stronger typographic hierarchy, and a clearer separation between navigation, learning modes, and personal study tools.

## Homepage

The hero has been reduced to the official MORPHORA lockup, the new brand line:

> Explore. Learn. Understand.

and a single primary **Enter the atlas** action. Feature lists and explanatory marketing copy were deliberately removed from the hero.

The species library now begins as the first substantial content block under the hero, with cleaner image-forward cards and quieter metadata.

## Atlas layout

At desktop widths of 1180 px and above:

- atlas controls become a persistent left-side dock;
- the specimen remains the dominant central element;
- clicked structure information becomes a right-side inspector;
- learning modes are visually grouped and separated from view/navigation utilities;
- personal notes/drawing tools occupy their own workspace group.

Tablet and mobile retain the compact interaction model. The mobile toolbar is restyled as a floating bottom control surface and structure information remains a bottom sheet.

## New visual architecture

`design-system.css` is loaded after the existing `style.css`. It defines:

- canonical MORPHORA navy/teal tokens;
- dark/light surfaces;
- typography hierarchy;
- spacing scale;
- radii;
- borders;
- shadows;
- reusable visual primitives;
- responsive layout rules.

This is intentionally an override layer. V4.9's mature functional stylesheet remains available underneath, reducing the risk of breaking atlas behavior during visual iteration.

## Design tokens

Representative tokens:

```css
--morphora-navy-900: #001030;
--morphora-teal-700: #21515e;
--morphora-teal-400: #75b0b1;
--ds-radius-md: 18px;
--ds-space-5: 24px;
--ds-accent: #75b0b1;
```

Future visual changes should prefer editing the design-system layer rather than scattering new values throughout legacy styles.

## Functional compatibility

Unchanged systems include:

- OpenSeadragon / Deep Zoom
- official atlas labels
- Content Studio
- image ingestion and publishing
- Study Mode
- Quiz Mode
- personal notes
- drawing layer
- learning progress
- V2 schemas
- project validation
- Performance Lab
- validation-gated GitHub Pages deployment

## Local preview

Use Live Server and test:

- `http://127.0.0.1:5500/`
- `http://127.0.0.1:5500/studio.html`
- `http://127.0.0.1:5500/dev-tools.html`
- `http://127.0.0.1:5500/performance-lab.html`

## Validation

Run:

```bash
npm run ci
```

The V4.9.2 release passes the complete CI-equivalent project and production-artifact validation pipeline with the existing expected warning for the intentionally missing canine cervical starter photograph.

## Deployment

Copy the contents of the V4.9.2 package into the local GitHub Desktop repository, preserve the existing `CNAME`, run `npm run ci`, commit, and push. The V4.8.6+ GitHub Actions release gate remains the production deployment mechanism.
