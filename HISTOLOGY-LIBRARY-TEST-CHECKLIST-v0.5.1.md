# Histology Library v0.5.1 Test Checklist

## Personal labels
- Open any WSI and choose **My labels**.
- Create a point label; confirm the click lands on the selected microscopic feature.
- Enter a title, select a preset color, and save.
- Confirm the colored marker and title remain anchored while pan/zooming.
- Edit the point and use **Move point**; confirm it moves without changing official structures.
- Delete the point and confirm it disappears.

## Color zones
- Choose **My labels → Color zone**.
- Add at least three vertices and finish the region.
- Select a custom color and adjust zone opacity.
- Save; confirm border, fill, and title use the selected color.
- Redraw the region and confirm persistence after reload.

## Layer separation
- Use **Official** / **Mine** tabs in the Structures list.
- Toggle Official visibility; personal annotations should remain visible.
- Toggle Mine visibility; official structures should remain visible.
- Confirm personal annotations never appear in Histology Studio's official structure list.
- Export a Studio manifest and confirm personal annotations are not included.

## Persistence/isolation
- Reload the page; personal labels should persist for the same slide/account workspace.
- Open another slide; labels from the first slide must not appear.
- Switch MORPHORA local account principal/guest workspace; annotations must remain isolated.

## Regression
- Drawing remains functional.
- Notes and bookmark remain functional.
- Histology Studio point/polygon authoring remains functional.
- PMA.start connection and all six slides remain functional.
