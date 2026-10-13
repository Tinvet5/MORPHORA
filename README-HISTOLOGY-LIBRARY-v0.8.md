# MORPHORA Histology Library v0.8

## Hosted Whole-Slide Architecture

v0.8 moves MORPHORA Histology from a PMA.start-only prototype to a provider-independent whole-slide viewer.

### What changed

- Added a hosted **Deep Zoom Image (DZI)** provider.
- Added **Auto** delivery mode: hosted DZI first, PMA.start fallback second.
- Added explicit **Hosted only** and **PMA.start only** developer modes.
- Added hosted DZI URL editing in Histology Setup.
- Preserved all v0.7.1 viewer, Studio, personal labels, Study, Quiz, Locate, Drawing, Notes, Bookmarks and cloud-sync behavior.
- Added a scanner-neutral DZI publishing toolkit under `tools/histology_wsi/`.
- Added per-slide `delivery` configuration while preserving the existing local `source` block.

### Important release state

The six current slide manifests are **hosted-ready but not yet published**. Their hosted DZI URLs intentionally remain blank, so `Auto` mode continues to use PMA.start until a slide is converted/uploaded and its final HTTPS `.dzi` URL is registered.

This makes migration incremental: one slide can be hosted without breaking the remaining local slides.

### Delivery model

```text
Auto
  ├─ Hosted DZI available → use hosted tiles
  └─ Hosted DZI unavailable → use PMA.start fallback
```

### Recommended pilot

Start with `hueso-4`, the smallest current MDSX package. Once the hosted pipeline is proven, publish the remaining slides using exactly the same workflow.

### No database migration

v0.8 changes whole-slide delivery only. It does not require new Supabase tables, policies or migrations.
