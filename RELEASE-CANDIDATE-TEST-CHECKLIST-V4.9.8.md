# MORPHORA V4.9.8 — Release Candidate Test Checklist

Use this checklist on the final deployment artifact after `npm run release:verify`.

## 1. Home / navigation
- [ ] Load the species library in a clean browser session.
- [ ] Confirm the home hero, catalog, footer logo, and four social/contact buttons render correctly.
- [ ] Open each available species/system/collection route and return using breadcrumbs/back controls.
- [ ] Confirm global search opens with Ctrl/Cmd + K and closes with Escape.
- [ ] Confirm no horizontal page overflow at 390 px, 768 px, 1024 px, and desktop widths.

## 2. Theme / language
- [ ] With no stored theme preference, confirm MORPHORA follows the OS light/dark preference.
- [ ] Toggle theme and reload; confirm the manual choice persists.
- [ ] Confirm the language popup changes with the active theme.
- [ ] Open the language menu with mouse/touch and select ES/EN.
- [ ] Keyboard: focus language control, use Arrow Down/Up to open; Home/End and arrows move through options; Escape closes and restores focus.
- [ ] Confirm theme-toggle accessible text changes language after switching ES/EN.

## 3. Atlas / Deep Zoom
- [ ] Open every available atlas view.
- [ ] Confirm the loading state remains until a visible image/tile is ready.
- [ ] Confirm zoom, pan, home/reset, label toggle, focus mode, and view switching work.
- [ ] Confirm label anchors, connectors, and info panels stay aligned through zoom/resize.
- [ ] Simulate an unavailable DZI source and confirm the compatible-image fallback is understandable and localized.

## 4. Study / Quiz
- [ ] Enter Explore, Study, and Quiz modes and move between them repeatedly.
- [ ] Run locate, choice, and flashcard sessions where eligible.
- [ ] Interrupt and resume a quiz session.
- [ ] Confirm progress totals/mastery update and survive reload.
- [ ] Export/import learning progress and verify round-trip integrity.

## 5. Notes / drawings / persistence
- [ ] Create, edit, recolor, move, search, and delete notes.
- [ ] Export/import notes using merge and replace flows.
- [ ] Draw, erase, undo/redo, hide/show, and clear drawings.
- [ ] Reload and switch views; confirm notes/drawings remain attached to the correct view.
- [ ] Confirm a storage warning/failure never destroys the active session.

## 6. Accessibility
- [ ] Tab through the header, discovery cards, footer links, drawers, dialogs, and atlas controls.
- [ ] Confirm focus is visible and returns to the opening control after modal/drawer dismissal.
- [ ] Test with prefers-reduced-motion enabled.
- [ ] Confirm no unexpected “Connection restored” announcement occurs on a normal online load.
- [ ] Confirm going offline shows/announces the localized offline status and reconnecting announces restoration once.

## 7. Mobile / vertical
- [ ] Test 390×844 or comparable phone viewport.
- [ ] Confirm header actions, species cards, footer, drawers, atlas toolbar, notes, Study, Quiz, and drawing controls remain usable.
- [ ] Rotate portrait ↔ landscape while viewing an atlas image.
- [ ] Confirm safe-area padding keeps fixed controls clear of device edges/home indicators.

## 8. Studio / developer workflow
- [ ] Open Content Studio and load existing repository data.
- [ ] Create/edit a draft label and confirm autosave/recovery.
- [ ] Run publication preflight.
- [ ] Open Developer Diagnostics and Performance Lab links in new tabs.
- [ ] Confirm source JSON export remains schema V2 and student runtime can load it.

## 9. Deployment gate
- [ ] Run `npm run check` — zero errors required.
- [ ] Review the known starter-image warning and confirm it remains intentional.
- [ ] Run `npm run release:verify` — both Validation and Release candidate gate must report `passed`.
- [ ] Confirm `dist/` excludes development-only folders and reports.
- [ ] Deploy the contents of `dist/` and perform a hard-refresh smoke test on morphora.cl.
