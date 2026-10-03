# MORPHORA V4.9.5.1 — Loading-State Hotfix

This maintenance patch fixes a brief image flash that could occur when switching anatomical views or loading a new image.

## Changes

- The public atlas loading shield is now fully opaque while a new OpenSeadragon source is being prepared.
- The loading shield no longer disappears on the OpenSeadragon `open` event. It remains visible until the first tile for the active view has loaded and the browser has had a paint opportunity.
- Late tile events from a previous view are ignored when OpenSeadragon exposes their `tiledImage`, preventing stale loads from completing the new view transition.
- Deep Zoom previews remain available internally, but they are not exposed through the loading shield before the new view is ready.
- Content Studio uses the same first-tile handoff so new/replaced photographs no longer flash during load.
- Local asset URLs use a `4.9.5-hotfix1` cache-busting suffix so the patch is visible immediately after replacing the files.

No data, schema, labels, notes, drawings, learning progress, or Studio content migration is required.
