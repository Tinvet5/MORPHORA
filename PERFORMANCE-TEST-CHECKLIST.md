# MORPHORA V4.7 performance test checklist

## Public atlas

- [ ] Each canine skull orientation opens through DZI.
- [ ] Low-resolution overview appears before close-detail tiles.
- [ ] Zoomed detail remains sharp.
- [ ] Labels remain aligned at home view and high zoom.
- [ ] Personal notes remain aligned and persistent.
- [ ] Orientation switching does not mix labels or notes.
- [ ] A deliberately broken DZI path opens the configured JPG fallback.
- [ ] No repeated fallback loop occurs.

## Studio

- [ ] Each DZI view loads in Studio.
- [ ] Anchor dragging works.
- [ ] Label-box dragging works.
- [ ] One-click anchor repositioning works.
- [ ] Exported JSON preserves `type`, `src`, `fallback`, and `thumbnail`.
- [ ] Existing local drafts restore correctly.

## Network and caching

- [ ] First visit loads the application normally.
- [ ] Repeat visit uses cached application assets.
- [ ] Service worker appears under browser developer tools.
- [ ] JSON updates are visible after deployment and hard refresh.
- [ ] Offline notice appears when the connection is disabled.
- [ ] Previously opened same-origin assets remain available where cached.
- [ ] Save-data mode does not prefetch the adjacent view.

## Diagnostics

- [ ] `?debug=performance` prints catalog timing.
- [ ] It prints view-data timing.
- [ ] It prints image-open timing.
- [ ] It prints first-visible-tile timing.

## Production validation

- [ ] `npm run check` succeeds.
- [ ] GitHub Actions validation succeeds.
- [ ] Only the expected coming-soon cervical warning remains.
- [ ] `CNAME` is preserved during deployment.
