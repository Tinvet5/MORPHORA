# MORPHORA V4.9 — Real-World Performance Audit & Optimization

V4.9 begins the performance-measurement phase after the V4.8 technical-hardening cycle. It preserves the existing student atlas, Studio, Study/Quiz, drawings, annotations, schemas, validation and deployment pipeline while adding real-device instrumentation and conservative runtime optimizations.

## Main goals

- Measure actual atlas timings on real student devices.
- Keep Deep Zoom quality while reducing unnecessary work on constrained devices.
- Prevent browser/service-worker caches from growing without bounds.
- Make performance regressions visible before they become production problems.
- Keep all performance history local to the browser unless the user explicitly exports it.

## New Performance Lab

Open with Live Server:

```text
http://127.0.0.1:5500/performance-lab.html
```

The Performance Lab shows:

- active runtime profile: Constrained, Balanced or High capacity
- browser connection hints when available
- device-memory / processor hints when available
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- long main-thread tasks
- browser storage usage and quota
- MORPHORA cache entry counts
- recent anatomical-view timings
- network request and transfer summaries
- the OpenSeadragon settings selected for the current device

Nothing is sent to a server automatically. The data is stored locally under:

```text
morphora:performance:v1
```

Use **Export report** in Performance Lab to save a JSON report for analysis.

## Per-view timing

V4.9 now measures the important milestones for each anatomical view:

```text
view requested
→ view JSON ready
→ OpenSeadragon source opened
→ first visible tile ready
```

This makes it possible to distinguish a JSON/network problem from an image-rendering problem.

## Adaptive OpenSeadragon profiles

MORPHORA now selects one of three viewer profiles at runtime:

### Constrained

Used for signals such as Data Saver, very slow network hints or low-memory / low-core devices.

- immediate rendering enabled
- 4 concurrent image loads
- 80-image OpenSeadragon cache
- higher minimum pixel ratio to reduce extra pyramid work
- adjacent-view prefetch disabled
- old viewer tiles can be cleared after the in-memory tile count becomes excessive

### Balanced

Default for most laptops, tablets and phones.

- 6 concurrent image loads
- 140-image OpenSeadragon cache
- touch devices enable immediate rendering automatically
- conservative adjacent-view prefetch remains available

### High capacity

Used only when the browser exposes strong desktop-class memory / processor hints.

- 8 concurrent image loads
- 200-image OpenSeadragon cache
- standard high-detail pyramid behavior

The profile is a local optimization hint, not a quality mode selected by the student.

## Bounded application caches

View-data and collection-manifest caches now behave as bounded LRU-style caches instead of growing indefinitely during long study sessions.

Default caps:

```text
View data:            24 entries
Collection manifests: 10 entries
```

This matters more as MORPHORA grows from a handful of skull views to hundreds of anatomical views.

## Service-worker cache changes

V4.9 separates Deep Zoom tiles from the general runtime cache.

```text
morphora-shell-<release>
morphora-runtime-<release>
morphora-data-<release>
morphora-tiles-<release>
```

Deep Zoom tiles use cache-first behavior inside a versioned release because tile URLs do not change during that release. Cache sizes are bounded:

```text
Runtime assets: 220 entries
JSON data:      100 entries
DZI tiles:      700 entries
```

Storage-quota pressure never blocks a network request; caching fails gracefully if the browser refuses additional storage.

## Static performance audit

Run:

```bash
npm run performance:audit
```

The audit checks:

- combined core shell size
- unusually large JavaScript files
- thumbnail size
- fallback-image size
- Deep Zoom tile count and total size
- oversized individual tiles

It writes:

```text
reports/performance-static.json
reports/performance-static.txt
```

The audit is also part of:

```bash
npm run check
```

## Current V4.9 baseline

The packaged canine-skull build reports approximately:

```text
Core shell:          440 KiB
Thumbnails:          7 files / 178 KiB
Fallback images:     5 files / 4.99 MiB
Deep Zoom tiles:     2,605 files / 6.97 MiB
Average DZI tile:    2.7 KiB
Largest DZI tile:    11.7 KiB
Static audit errors: 0
Static warnings:     0
```

These values are a repository baseline. Real-device speed must still be measured in Performance Lab.

## Performance targets

V4.9 includes observational targets in `app-config.js`:

```text
Shell interactive:      1,000 ms
Preview visible:        1,500 ms
First atlas tile:       2,000 ms
Cached view switch:     1,000 ms
Long-task threshold:       50 ms
LCP:                    2,500 ms
CLS:                        0.10
```

These are development goals, not guarantees. Network conditions, browser state and hardware vary.

## Installation

1. Back up the current local repository.
2. Copy the contents of this V4.9 folder into the MORPHORA repository.
3. Keep the existing root `CNAME` file containing `morphora.cl`.
4. Run:

```bash
python -m pip install -r tools/requirements.txt
npm run ci
```

5. Preview with Live Server:

```text
http://127.0.0.1:5500/
http://127.0.0.1:5500/studio.html
http://127.0.0.1:5500/dev-tools.html
http://127.0.0.1:5500/performance-lab.html
```

6. Use GitHub Desktop to commit and push after local testing.

## Recommended real-device test

For each target device:

1. Open MORPHORA after a normal browser restart.
2. Visit several skull views.
3. Zoom deeply into at least two regions.
4. Switch between views several times.
5. Use Study Mode, notes and drawings briefly.
6. Return to `performance-lab.html`.
7. Export the report.

Repeat on:

- desktop Chrome / Edge / Firefox
- iPad Safari
- iPhone Safari
- Android Chrome
- at least one slower or older device if available

## Scope

V4.9 intentionally does not add a new student-facing learning feature. It improves the engine underneath the existing atlas and creates the measurement foundation needed before V4.9.1 student beta testing.
