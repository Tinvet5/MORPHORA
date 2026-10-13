# MORPHORA Histology Library v0.4 — Student Workspace

v0.4 converts the proven multi-slide whole-slide viewer into a student-facing workspace while preserving the PMA.start/OpenSeadragon transport layer.

## What changed

- Technical PMA.start URL/path/metadata controls moved out of the student sidebar into a dedicated Developer panel.
- Viewer automatically attempts the local PMA.start connection when a slide opens.
- Student sidebar now centers on learning context, tools, structures and progress.
- Slide-level Notes are stored locally and scoped to the current MORPHORA local-vault principal.
- Slide-level Bookmark state is stored in the same account-scoped local Histology workspace.
- Drawing supports pen, highlighter, eraser, size/color, undo and clear. Strokes use normalized slide coordinates so they stay aligned while panning and zooming.
- Structure overlay engine renders manifest point and polygon geometry and powers the Structures list/search foundation.
- Study and Quiz entry points are visible but intentionally unavailable until authored structures/questions exist.
- Histology Studio authoring controls remain a v0.5 milestone; v0.4 exposes only the foundation and technical setup panel.
- All six v0.3 slides remain available through one dynamic viewer.

## Local testing

1. Start PMA.start.
2. Open the MORPHORA folder with VS Code Live Server.
3. Open `histology.html` and select any slide.
4. The viewer attempts to connect automatically. If PMA.start authorization is needed, open the gear / Local setup panel and use **Authorize browser**.
5. Test Notes, Bookmark and Drawing on multiple slides.

Histology personal workspace data is local-only in v0.4. Cloud synchronization is intentionally reserved for a later Histology milestone.
