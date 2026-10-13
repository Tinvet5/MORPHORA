# MORPHORA V4.8.1 — Studio image upload checklist

## New view
- Select target species/system/collection.
- Open New view from image.
- Select JPG/PNG/WebP.
- Confirm dimensions are shown.
- Confirm view ID uses lowercase hyphenated form.
- Confirm repository image path.
- Create local view.
- Add at least one label and verify drag works.
- Test Place anchor click.
- Test Place label click.
- Validate JSON.
- Export JSON or save to project folder.

## Existing view replacement
- Open an existing view.
- Replace current image.
- Confirm labels remain present.
- Confirm dimensions update.
- Confirm drag and click positioning work.
- Validate before export.

## Project-folder save
- Use Chrome/Edge/another browser exposing `showDirectoryPicker`.
- Choose the MORPHORA repository root, not an individual subfolder.
- Confirm the image appears at its configured path.
- Confirm the view JSON exists in `data/views/`.
- For a new view, confirm the collection manifest contains its entry.
- Run `npm run check`.
