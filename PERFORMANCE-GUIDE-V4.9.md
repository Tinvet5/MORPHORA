# MORPHORA V4.9 — Performance Testing Guide

## Why real-device testing matters

Repository size and automated checks cannot reproduce the interaction between hardware, browser tile decoding, touch input, memory pressure and network quality. V4.9 therefore combines a static repository audit with local browser measurements.

## Test URLs

With Live Server:

```text
Atlas:           http://127.0.0.1:5500/
Performance Lab: http://127.0.0.1:5500/performance-lab.html
Debug console:   http://127.0.0.1:5500/?debug=performance#/species
```

## Suggested cold test

1. Close unrelated heavy browser tabs.
2. Open a fresh MORPHORA tab.
3. Navigate to canine skull.
4. Open lateral view.
5. Zoom into a structure.
6. Switch to ventral, dorsal and cranial views.
7. Return to Performance Lab.
8. Export a report.

## Suggested warm-cache test

Without clearing browser data:

1. Reopen the same collection.
2. Repeat the same view switches.
3. Compare first-tile timings with the cold run.

## What to investigate

- First-tile timings repeatedly above 2 seconds on a fast network.
- Large numbers of long tasks above 50 ms.
- LCP repeatedly above 2.5 seconds.
- CLS above 0.1.
- Cache entry counts growing unexpectedly across repeated sessions.
- Browser storage usage increasing rapidly after ordinary zooming.
- Significant slowdown after switching views many times.
- Touch devices that accidentally pan while drawing or draw while pinching.

## Privacy

Performance history is browser-local. MORPHORA does not transmit it automatically. Exported performance JSON should be treated as diagnostic data and shared only deliberately.
