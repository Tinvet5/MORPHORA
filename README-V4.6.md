# MORPHORA V4.6 — Responsive, Accessibility & Usability Audit

V4.6 builds on V4.5 without changing the anatomical content model. It improves the public atlas and Content Studio across desktop, tablet, mobile, keyboard and touch input.

## Main improvements

### Public atlas
- Mobile bottom toolbar for Library, Labels, Search, Notes and More.
- Mobile atlas controls become a bottom sheet instead of a small floating panel.
- Information panel and OpenSeadragon navigator stay above mobile controls.
- Larger touch targets and a coarse-pointer drag threshold.
- Focus trapping and focus restoration for Library, My Notes, search and note editor dialogs.
- Skip-to-content links and a shared screen-reader live region.
- Stronger focus indicators, high-contrast support and forced-color support.
- Safe-area spacing for modern phones.
- Improved portrait and landscape layouts.
- Expanded reduced-motion behavior.

### Content Studio
- Mobile/tablet panel switcher: Library, Viewer and Inspector.
- Precision-workspace advisory on small phones.
- Larger label handles and controls on touch devices.
- Single-panel mobile layout instead of one very long page.
- Improved landscape behavior.
- Skip link and shared accessibility announcements.
- Existing unsaved-change protection remains active.

## Installation

Copy the **contents** of this folder into the GitHub Pages publishing root and keep the existing `CNAME` file.

Required root files include:

```text
index.html
style.css
script.js
navigation.js
accessibility.js
studio.html
studio/
assets/
data/
images/
```

The asset and JSON cache version is `4.6.0`.

## Testing locally

Use VS Code Live Server or:

```bash
python -m http.server 5500
```

Open:

```text
http://localhost:5500/#/species
http://localhost:5500/studio.html
```

Do not double-click the HTML files because JSON is loaded through `fetch()`.

## Suggested device checks

- Desktop at 1440 × 900 and 1920 × 1080.
- Laptop at 1280 × 720.
- Tablet at 1024 × 768 and 768 × 1024.
- Mobile at approximately 390 × 844.
- Mobile landscape with a short viewport.
- Browser zoom at 125%, 150% and 200%.
- Keyboard-only navigation.
- Reduced-motion and high-contrast operating-system settings.

## Notes

The Content Studio is still an unauthenticated static workspace. Keep it local if the editing URL should remain private.
