# MORPHORA V4.5 — Persistent Personal Annotations

V4.5 upgrades the public atlas note system into a persistent private study tool. Personal notes are stored in the current browser with `localStorage`; they are not added to official atlas JSON and are not uploaded to a server.

## Main features

- Automatic saving and restoration by anatomical view ID
- Create notes through the existing Add note workflow
- Edit title, description, and color in a dedicated dialog
- Drag notes directly over the OpenSeadragon image
- My notes drawer for the current view
- Note count badge in the atlas controls
- Focus and zoom to a note from My notes
- Delete one note, clear a view, or clear all notes
- Export all personal notes as `morphora-personal-notes.json`
- Import a backup using MERGE or REPLACE behavior
- Corrupted-storage recovery and storage error feedback
- Desktop, touch, and keyboard support

## Storage key

```text
morphora:annotations:v1
```

The stored model is:

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-08-02T23:30:00.000Z",
  "views": {
    "dog-skull-lateral": [
      {
        "id": "annotation-...",
        "viewId": "dog-skull-lateral",
        "manifestPath": "data/collections/dog-skull.json",
        "viewLabel": "Lateral",
        "title": "Important landmark",
        "description": "Review its relationship with the orbit.",
        "color": "#fff8a0",
        "position": { "x": 0.42, "y": 0.35 },
        "createdAt": "...",
        "updatedAt": "..."
      }
    ]
  }
}
```

## User workflow

1. Open an atlas view.
2. Open controls and choose **Add note**.
3. Click the anatomical image.
4. Choose a color.
5. Enter a title and description.
6. Drag the note to reposition it; the new position saves on release.
7. Click a note to open its information and edit, recolor, or delete it.
8. Open **My notes** to browse notes in the current view.

## Backup behavior

- **Export backup** downloads every note stored by this browser.
- **Import backup** asks the user to type `MERGE` or `REPLACE`.
- Clearing browser site data may erase notes, so regular exports are recommended.

## Installation

Copy the contents of this folder into the GitHub Pages publishing root. Keep the existing `CNAME` file.

The primary files changed for V4.5 are:

```text
index.html
style.css
script.js
navigation.js
studio.html
studio/studio.js
```

The cache version is `4.5.0`.

## Privacy limitation

V4.5 is local-only. Notes do not synchronize between devices and are not visible to MORPHORA administrators. Cloud synchronization should be introduced only after authentication and a protected backend are implemented.
