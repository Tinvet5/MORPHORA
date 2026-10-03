# MORPHORA V4.9.4 — Visual Polish & Interaction Detail

V4.9.4 is a focused presentation/interaction release built directly on V4.9.3. It does not change atlas schemas, content JSON, Studio publishing, Deep Zoom data, Study/Quiz storage, annotations, drawings, or deployment architecture.

## What changed

### Refined structure inspector
- Stronger editorial hierarchy for anatomical structure details.
- Structure category appears as a compact metadata chip.
- Current anatomical orientation/view appears beside the category.
- More readable description line length and spacing.
- Personal annotations use the same inspector while retaining note-specific actions.
- Mobile inspector now reads as a bottom sheet with a subtle grab handle.

### Segmented anatomical view control
- Lateral / ventral / dorsal / cranial / caudal choices now render as a compact segmented orientation control inside Atlas Tools.
- Active view is visually distinct without heavy button chrome.
- Existing view routing and Deep Zoom loading are unchanged.

### Focus View
- New `Focus view` action in Atlas Tools.
- Hides the main header, Atlas Tools, mobile toolbar, structure inspector, minimap, and nonessential status chrome.
- Leaves the anatomical specimen, official labels, Study/Quiz overlays, and drawing layers intact.
- A discreet `Exit focus` control remains available.
- `Esc` exits Focus View when no higher-priority dialog/panel is open.

### Anatomical label polish
- Thinner connector lines.
- Quieter label boxes at rest.
- More restrained anchor glow/pulse.
- Clearer hover/focus/selected treatment.
- Light-mode contrast preserved.

### Search refinement
- Typed text is highlighted inside live label suggestions.
- Suggestions now include structure category plus current orientation context.
- Existing keyboard navigation (Up/Down/Enter/Escape) is preserved.

### Motion and loading polish
- Shared interaction timing/easing tokens added to the design system.
- Refined panel/menu transitions.
- Viewer loading card receives a subtle progress sweep.
- `prefers-reduced-motion` remains authoritative.

## Compatibility

V4.9.4 keeps the V2 data schema and requires no content migration. Existing:

- Deep Zoom tile sets
- view JSON files
- Studio drafts and publishing flow
- notes
- drawings
- study progress
- quiz metadata
- service-worker/runtime caches

remain compatible.

## Local testing

Use Live Server and test:

1. Open the canine skull atlas.
2. Open **Atlas tools** and switch among anatomical views.
3. Search for a structure and confirm typed text is highlighted in suggestions.
4. Open a structure and inspect category/view metadata.
5. Enable **Focus view** and confirm the specimen remains interactive.
6. Press `Esc` or **Exit focus** to restore the interface.
7. Verify Study, Quiz, Notes, Draw, and mobile controls still function normally.

## Validation

The release is expected to pass:

```text
npm run check
```

with 0 errors and the existing expected warning for the intentionally missing canine cervical C1 photograph.
