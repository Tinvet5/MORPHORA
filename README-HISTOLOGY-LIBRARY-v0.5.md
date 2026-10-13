# MORPHORA Histology Library v0.5 — Histology Studio

v0.5 adds a real content-authoring workflow on top of the stable v0.4.1 Student Workspace.

## New in v0.5

- Create point structures directly on a connected whole-slide image.
- Create polygon/region structures by clicking multiple vertices and finishing the region.
- Add bilingual English/Spanish names and descriptions plus a category.
- Edit, reposition/redraw, focus, and delete authored structures.
- Local per-slide Studio draft persistence so authoring survives reloads without modifying source manifests automatically.
- Export the complete updated slide manifest as JSON for review/version control.
- Student Structures list and overlay update immediately from the Studio draft.
- Study/Quiz remain intentionally disabled until the v0.6 learning-mode milestone.

## Authoring workflow

1. Keep PMA.start running and open a Histology slide.
2. Open the gear button → Histology Studio.
3. Choose **Point structure** or **Region structure**.
4. Place the structure on the slide. For regions, click at least three vertices and choose **Finish region**.
5. Add bilingual names/descriptions and save.
6. Use Focus/Edit to review the authored structure.
7. Export JSON. The download uses the slide ID as its filename (for example `48515-2.json`) and contains the entire slide manifest with the current `structures` array.
8. After review, replace the matching file under `histology/slides/` with the exported manifest to make the content part of source control.

## Safety / persistence

Studio drafts are intentionally browser-local and separate from student notes/drawings. Reset Draft returns to the structures stored in the source manifest. The original MDSX slide is never modified.
