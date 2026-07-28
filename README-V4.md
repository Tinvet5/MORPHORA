# MORPHORA V4 — Brand Integration

This version integrates the finalized MORPHORA identity into the working V3.3 multi-collection platform.

## Included
- Official primary, white and black logo SVGs
- Official primary, white and black icon SVGs
- Branded favicon and touch icon
- Redesigned header, species library, species hub, collection cards, drawer, atlas controls, information panel and loading states
- Dark and light themes derived from the official navy `#001030` and teal `#21515e`
- Existing multi-collection JSON architecture, routing, OpenSeadragon viewer, labels, search and annotations preserved

## Install
Copy the contents of this folder into the GitHub Pages publishing root. Keep the repository's existing `CNAME` file.

Run locally through VS Code Live Server or another HTTP server because JSON files are loaded with `fetch()`.

## Brand font
The supplied Trajan Pro font file is intentionally not bundled. The official SVG logo already contains outlined lettering, and public web embedding should only be done after confirming the font's web-use license. The interface uses Cormorant Garamond for editorial headings and Inter for readable UI text.
