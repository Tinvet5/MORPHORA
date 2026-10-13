# Histology Library v0.8.1 Test Checklist

## Regression baseline
- [ ] All six slides remain available.
- [ ] PMA.start still works in Local-only mode.
- [ ] Auto mode still falls back to PMA.start when no hosted descriptor is registered.
- [ ] v0.7.1 sidebar remains constrained to the viewport and scrolls internally.
- [ ] Personal labels, drawings, notes, bookmarks and cloud sync persist normally.
- [ ] Study, Quiz and Locate work normally.

## Hosted source check
- [ ] Empty descriptor reports a useful error.
- [ ] Valid local DZI descriptor reports Ready.
- [ ] Descriptor dimensions are displayed/validated against the manifest.
- [ ] A descriptor with changed width or height is rejected.
- [ ] Missing level-0 tile is rejected.

## Local DZI pilot
- [ ] `pilot_slide.py` validates the Hueso-4 fixture.
- [ ] `Use local DZI pilot` sets Hosted DZI only.
- [ ] Hueso-4 opens from `127.0.0.1:8008` with PMA.start stopped.
- [ ] Active provider reports Hosted DZI.
- [ ] Restore Auto returns to manifest defaults while preserving PMA.start path settings.

## Coordinate integrity
- [ ] Official point labels remain aligned.
- [ ] Official polygon regions remain aligned.
- [ ] Personal points/zones remain aligned.
- [ ] Drawings remain aligned through pan/zoom.
- [ ] Locate grading remains aligned.

## Repository safety
- [ ] `hosted-slides/` generated contents are ignored by Git.
- [ ] DZI pyramids are not included in source/release ZIPs unless intentionally supplied as tiny test fixtures.
