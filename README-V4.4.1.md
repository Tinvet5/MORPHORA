# MORPHORA V4.4.1 — One-click Anchor Repositioning

This patch adds a dedicated **Reposition anchor** mode to the MORPHORA Content Authoring Studio.

## Workflow

1. Open `studio.html` through Live Server or GitHub Pages.
2. Select an existing label from the image or label list.
3. Choose **Reposition anchor** in the toolbar, or **Choose a new point on the image** in the inspector.
4. Click the new anatomical point.
5. MORPHORA moves the anchor while preserving the text box's relative offset.
6. The Studio returns to Browse mode automatically.

The action is included in Undo/Redo history. Press `R` to activate Reposition anchor for the selected label, or `Escape` to cancel.

## Installation

Copy the contents of this release into the GitHub Pages publishing root, preserving your existing `CNAME` file. The asset cache version is `4.4.1`.
