# MORPHORA V4.8 — Study Mode & Quiz Engine

V4.8 turns the interactive atlas into an active-learning workspace while preserving all V4.7 features: Deep Zoom, responsive navigation, persistent notes, Content Studio, validation tools and GitHub Pages deployment.

## New learning modes

### Explore
The familiar atlas experience. Official labels, descriptions, search and personal notes work normally.

### Study
Official labels are hidden for active recall. Students can:

- move through structures one by one;
- reveal or hide the current structure;
- reveal or hide all structures;
- mark difficult structures for review;
- search the current view's structure list;
- see locally saved mastery for each structure.

### Quiz
Three session types are included:

1. **Locate** — the student clicks the anatomical point requested by MORPHORA.
2. **Multiple choice** — MORPHORA highlights an anchor and the student selects its name.
3. **Flashcards** — the student recalls the highlighted structure, reveals the answer and rates recall as Again, Difficult, Good or Easy.

## Quiz results and progress

V4.8 records, locally in the browser:

- attempts and correct answers per structure;
- mastery percentage;
- structures marked for review;
- recent quiz sessions;
- accuracy and average response time;
- missed structures for targeted repetition.

Storage key:

```text
morphora:learning-progress:v1
```

The Progress drawer supports JSON export, import/merge and complete deletion.

## Content Studio additions

Every label now supports:

```json
{
  "quizEligible": true,
  "difficulty": "intermediate",
  "acceptedRadius": 0.045
}
```

- `quizEligible`: excludes unsuitable labels from Study/Quiz when false.
- `difficulty`: `beginner`, `intermediate` or `advanced`.
- `acceptedRadius`: normalized tolerance for Locate questions, from `0.005` to `0.2`.

Recommended Locate tolerances:

- broad bones: `0.055–0.075`
- medium landmarks/processes: `0.040–0.055`
- small foramina/fissures: `0.025–0.040`

Existing labels without these fields remain compatible. MORPHORA defaults them to quiz eligible, intermediate difficulty and a `0.045` tolerance.

## Keyboard behavior

During a quiz:

- `1–4`: answer multiple-choice questions;
- `Enter` or `Space`: reveal a flashcard or advance after feedback;
- `Escape`: request to end the session.

All drawers and dialogs use focus trapping and restore focus when closed.

## Main new file

```text
study.js
```

It must be deployed beside `script.js` and `navigation.js`. It is also included in the service-worker application shell and automated JavaScript checks.

## Installation

1. Back up the current V4.7 repository.
2. Copy the **contents** of this V4.8 folder into the GitHub Pages repository root.
3. Keep the existing `CNAME` file.
4. Commit the complete project, including `study.js` and updated view JSON files.
5. Run:

```bash
npm run check
```

6. Push to GitHub and wait for the validation workflow.
7. Hard refresh the live site once:

```text
Ctrl + Shift + R
```

The application/cache version is `4.8.1`.

## Privacy

Learning progress is private to the current browser and device. It is not uploaded to MORPHORA and does not synchronize automatically. Students should export a backup before clearing browser data or moving devices.

## Compatibility

V4.8 keeps the V4.7 data architecture and supports both normal images and DZI sources. Official label positions, personal annotations and Studio exports remain compatible.
