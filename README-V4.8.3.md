# MORPHORA V4.8.3 — Studio & Content Pipeline Hardening

V4.8.3 focuses on the authoring workflow rather than adding a new student-facing learning mode. The goal is to make the path from a new anatomy photograph to a publishable atlas view safer, recoverable and easier to repeat.

## Main changes

### 1. Batch photograph ingestion
Studio can now add several JPG, PNG or WebP files to the current collection in one operation. Each photograph receives:

- a collision-safe view ID derived from its filename;
- a starter title and button label;
- inferred anatomical orientation when the filename contains lateral, medial, dorsal, ventral, cranial, caudal or rostral;
- `images/views/<view-id>.<ext>` as the repository image path;
- `data/views/<view-id>.json` as the view-data path;
- a local collection entry marked as draft.

No collection JSON needs to be edited by hand merely to begin authoring the batch.

### 2. View metadata editor
A new **View metadata** panel lets an editor adjust the current view title, short navigation label, orientation, image path and image alternative text directly in Studio. The view ID and JSON path remain locked after creation so links, quiz progress, drafts and manifests are not broken accidentally.

### 3. Recoverable local photographs
Uploaded photographs are stored in IndexedDB when the browser supports it. Studio can therefore recover a local image together with its JSON draft after an accidental reload or browser restart. New local collection entries are also remembered in a collection draft so they can reappear in the Studio selector before publication.

This is draft recovery, not cloud storage. The photograph is still not part of the public site until it is written to the local repository and pushed to GitHub.

### 4. Stronger autosave
Studio drafts now store:

- the view JSON;
- its collection-manifest entry;
- local image-session metadata;
- the save timestamp.

The header shows the latest autosave time. Drafts are also flushed when the tab becomes hidden or the page is left.

### 5. Verified project-folder connection
On Chromium-based browsers, **Connect project folder** asks for the local MORPHORA Git repository and verifies that it contains:

- `index.html`
- `studio.html`
- `data/catalog.json`

This prevents accidentally writing atlas files into the wrong folder.

### 6. Publish preflight
Before Studio writes to disk it checks the current content for:

- view/label validation errors;
- stable and matching view IDs;
- safe repository-relative paths;
- duplicate collection IDs or data paths;
- image availability;
- verified project root;
- Deep Zoom descriptor availability when applicable;
- new-view file collisions on disk.

Warnings can be reviewed, while blocking errors prevent direct publication.

### 7. Safer direct publishing
**Publish current view** writes the current view JSON and collection manifest, plus the photograph when it was locally uploaded. Before replacing an existing file Studio copies the previous version to:

`.morphora-backups/<timestamp>/...`

The backup folder is ignored by Git through `.gitignore`, so safety copies remain local and do not pollute the GitHub repository.

For image batches, unpublished local views are deliberately excluded from the manifest written to disk. A collection manifest only receives each new view when that individual view is published. This prevents the live atlas from referencing batch images that have not been written yet.

### 8. GitHub Desktop workflow
V4.8.3 does not silently push to GitHub. The intended workflow is:

1. Open Studio through Live Server/local HTTP.
2. Choose the destination collection.
3. Add one image or an image batch.
4. Refine View metadata.
5. Add and validate labels.
6. Connect the local GitHub repository.
7. Run Publish preflight.
8. Publish current view.
9. Repeat for the other new views.
10. Open GitHub Desktop, review Changes, Commit to `main`, then Push origin.

### 9. OpenSeadragon cleanup
The default OpenSeadragon `+ / − / home / fullscreen` button cluster is disabled in both the public atlas and Content Studio. MORPHORA's own controls and the navigator remain available.

## Browser behavior

Direct folder publishing uses the File System Access API and is intended for Chromium-based browsers such as Chrome or Edge. Other browsers retain the safe fallback workflow: **Validate → Export JSON → copy the image/file into the repository manually**.

IndexedDB image recovery is separate from direct folder access and is supported by modern browsers more broadly.

## Version

Runtime/cache version: `4.8.3`

After deploying the release, perform one hard refresh so the updated service-worker shell is installed.
