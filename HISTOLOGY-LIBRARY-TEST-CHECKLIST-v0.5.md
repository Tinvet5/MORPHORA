# Histology Library v0.5 test checklist

## Student workspace regression
- Open all six catalog slides through the shared viewer.
- Notes, bookmarks, drawing, zoom/pan, language, theme, and developer source setup still work.

## Histology Studio
- Open a connected slide and gear → Histology Studio.
- Add Point: click tissue, enter EN/ES names, save, verify marker + student Structures list.
- Edit the point, choose Move point, place it elsewhere, save, verify new position.
- Add Region: click at least three vertices, Finish region, add EN/ES content, save, verify polygon.
- Edit region, Redraw region, save, verify replacement geometry.
- Focus from Studio list centers/zooms to structure.
- Delete removes structure from Studio and student list.
- Reload page: local Studio draft persists.
- Export JSON downloads complete slide manifest with structures.
- Reset draft restores source-manifest structures.

## Interaction isolation
- Drawing and Studio authoring do not run simultaneously.
- OSD pan/zoom is disabled only during active placement and restored afterward.
- Esc cancels placement or closes panels safely.
