# MORPHORA V4.9.3 — Navigation & Search Test Checklist

## Species hub

- [ ] Dog page opens without layout overflow.
- [ ] Species hero is compact on desktop and mobile.
- [ ] All systems filter is selected by default.
- [ ] Skeletal system filter works.
- [ ] Coming-soon system filters remain understandable but visually secondary.
- [ ] Available Canine skull collection is visually primary.
- [ ] Planned collections render as compact cards.
- [ ] Returning to All systems restores all registered collections.

## Atlas tools

- [ ] Desktop shows a compact Atlas tools launcher, not a permanent sidebar.
- [ ] Launcher opens the tools panel.
- [ ] Clicking outside closes the panel.
- [ ] Escape closes the panel.
- [ ] Existing view buttons work.
- [ ] Labels toggle works.
- [ ] Study and Quiz controls work.
- [ ] Notes and drawing controls work.
- [ ] OpenSeadragon navigator remains correctly positioned.

## Label autocomplete

- [ ] Search suggestions appear while typing.
- [ ] Suggestions only use labels from the active view.
- [ ] Prefix matches are prioritized.
- [ ] Maximum suggestion list remains compact.
- [ ] Mouse/touch selection works.
- [ ] Arrow Down and Arrow Up move the active option.
- [ ] Enter selects the active option.
- [ ] Escape dismisses suggestions without closing unrelated UI.
- [ ] Selecting a label pans/zooms to its anchor.
- [ ] Selected label information opens in the inspector.
- [ ] No-match status remains understandable.

## Regression

- [ ] Deep Zoom loads normally.
- [ ] Notes persist.
- [ ] Drawings persist.
- [ ] Study/Quiz progress persists.
- [ ] Studio opens and publishes normally.
- [ ] Dev Tools opens.
- [ ] Performance Lab opens.
- [ ] `npm run ci` passes.
