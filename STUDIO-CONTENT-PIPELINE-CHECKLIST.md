# MORPHORA V4.8.3 — Studio content-pipeline test checklist

## Single photograph
- Select an existing collection.
- Create a new view from JPG/PNG/WebP.
- Confirm the image appears and View metadata fields are populated.
- Add a label, reload the page, restore the draft and confirm the local photograph returns.
- Confirm the new view reappears in the selector after reload.

## Batch photographs
- Choose Image batch and select at least three images.
- Confirm unique IDs are created even when filenames collide after slugification.
- Confirm orientation is inferred from filenames when possible.
- Confirm each local view can be selected and labeled independently.
- Publish only the first view and inspect the collection manifest: unpublished batch siblings must not be written into it.

## Metadata
- Change title, button label, orientation and alt text.
- Confirm the view selector updates after the button label is changed.
- Confirm view ID and JSON path cannot be edited.
- Enter an invalid image path and confirm Studio refuses the change.

## Draft recovery
- Edit a view and wait for the Autosaved timestamp.
- Refresh and restore the draft.
- Replace an existing view image, refresh, restore the draft and confirm the replacement photograph is recovered from browser storage.

## Project-folder safety
- Choose a random folder and confirm MORPHORA rejects it.
- Choose the actual local repository root and confirm it is marked connected.
- Run preflight with a valid existing view.
- For a new view, create a conflicting target file and confirm preflight blocks publication.

## Publishing
- Publish an existing edited view.
- Confirm the view JSON is updated on disk.
- Confirm the collection manifest is written.
- For a locally uploaded image, confirm the image is written too.
- Confirm previous overwritten files appear under `.morphora-backups/<timestamp>/`.
- Confirm `.morphora-backups/` does not appear in GitHub Desktop changes.

## Regression
- Content Studio label dragging and one-click Place anchor/Place label still work.
- Study/Quiz still load.
- Persistent notes still load.
- Drawing layer still loads.
- Deep Zoom skull views still open and zoom.
- MORPHORA custom navigation remains usable with the default OpenSeadragon button cluster absent.
