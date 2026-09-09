# MORPHORA V4.8.1 — Studio Refinement

V4.8.1 is a focused Content Studio update built on V4.8. The public atlas, Deep Zoom delivery, persistent annotations, accessibility layer and Study/Quiz engine remain compatible.

## 1. Positioning workflow

A selected anatomical label can now be positioned in four ways:

- Drag the anchor hotspot. The text label keeps its relative offset.
- Drag the label box. The anatomical anchor remains fixed.
- Select **Place anchor**, then click the desired anatomical point.
- Select **Place label**, then click where the text box should sit.

The inspector contains matching **Place anchor by clicking image** and **Place label by clicking image** actions.

Keyboard shortcuts while the focus is not inside a form field:

- `R` — Place anchor
- `L` — Place label
- `Esc` — return to Browse
- `Shift + click` in Browse — place the selected anchor
- `Alt/Option + click` in Browse — place the selected label box

Dragging now has a small movement threshold. A normal click no longer creates a false drag/history entry, and the final coordinates are explicitly committed and shown after release.

## 2. Upload photographs directly in Studio

The left Studio panel now contains **Developer image tools**.

### New view from image

1. Select the species/system/collection that should contain the new photograph.
2. Press **New view from image**.
3. Choose a JPG, PNG or WebP.
4. Confirm the view title, button label, view ID, orientation, repository image path and alternative text.
5. Press **Create local view**.
6. Label the image immediately in Studio.

The browser uses a temporary local object URL for the editing preview while the exported JSON stores the repository-relative path you entered.

### Replace current image

Press **Replace current image** to temporarily replace the image for the current view. The view ID and labels stay intact, and image dimensions are updated automatically.

### Save view to project folder

On browsers that support the File System Access API (Chromium-family browsers), **Save view to project folder** lets you choose the MORPHORA repository root. Studio then writes:

- the uploaded photograph to its configured repository path;
- the current view JSON to `data/views/...`;
- for a newly created local view, the updated collection manifest.

The browser always asks you to choose/authorize the folder. Studio does not receive unrestricted filesystem access.

On browsers without this API, use **Export JSON** and manually copy the photograph to the path shown in the dialog.

## 3. Deep Zoom note

Browser uploads enter Studio as standard image views so they are immediately editable. For production performance, the photograph can later be converted to DZI with the V4.7 production tools. Normalized label coordinates remain compatible after conversion.

## 4. Publishing a new view

Recommended workflow:

1. Upload photograph in Studio.
2. Place and edit labels.
3. Validate.
4. Either use **Save view to project folder** or export JSON and copy the image manually.
5. For a new view, ensure its collection manifest contains the new view entry.
6. Run `npm run check`.
7. Optionally convert the image to Deep Zoom.
8. Commit and push to GitHub.

## 5. Version

Application/cache version: `4.8.1`.
