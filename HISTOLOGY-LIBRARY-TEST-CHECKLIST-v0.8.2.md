# Histology Library v0.8.2 Test Checklist

## PMA exporter

- [ ] PMA.start is running on `127.0.0.1:54001`.
- [ ] `plan_hueso4_pma_export.cmd` reports Hueso-4 as `21,959 × 59,088 px`.
- [ ] Export plan prints PMA and DZI level mapping before any tile download.
- [ ] Geometry mismatch aborts before writing a usable derivative.
- [ ] `export_hueso4_from_pma.cmd` creates `hosted-slides/hueso-4/slide.dzi` and `slide_files/`.
- [ ] Interrupting and rerunning the export resumes completed tiles.
- [ ] Final `validate_dzi.py` check passes.

## PMA-free pilot

- [ ] Generated tiles are served on port `8008`.
- [ ] Histology Setup → `Use local DZI pilot` selects Hosted DZI only.
- [ ] Hueso-4 opens from `http://127.0.0.1:8008/hueso-4/slide.dzi`.
- [ ] PMA.start can be fully closed and Hueso-4 continues to load after refresh.
- [ ] Navigator and scale bar remain correct.
- [ ] Official structures remain aligned.
- [ ] Personal labels and zones remain aligned.
- [ ] Drawings remain aligned.
- [ ] Study / Quiz / Locate still work.

## Regression

- [ ] All six Histology manifests still load through PMA.start fallback when no hosted URL is registered.
- [ ] Cloud sync remains functional.
- [ ] v0.7.1 sidebar viewport fix remains intact.
- [ ] Anatomy routes and Study/Quiz are unaffected.
