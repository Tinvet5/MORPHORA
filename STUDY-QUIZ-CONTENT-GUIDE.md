# MORPHORA V4.8 — Preparing Labels for Study and Quiz

Each official label can participate in active learning without creating separate quiz content.

## Recommended fields

```json
{
  "id": "infraorbital-foramen",
  "name": "Agujero Infraorbitario",
  "position": { "x": 0.655, "y": 0.36 },
  "quizEligible": true,
  "difficulty": "intermediate",
  "acceptedRadius": 0.035
}
```

## Eligibility

Set `quizEligible` to false when a label is unsuitable for assessment, for example:

- a very broad region without a precise anchor;
- an overlapping label that would produce ambiguous answers;
- a structure still under editorial review;
- a structure that cannot be selected reliably on a small screen.

## Difficulty

Difficulty is editorial metadata and does not alter the anatomical content.

- `beginner`: conspicuous structures and broad bones;
- `intermediate`: common landmarks, processes and foramina;
- `advanced`: small fissures, sutures or closely adjacent structures.

## Locate tolerance

`acceptedRadius` is measured in normalized OpenSeadragon viewport coordinates. Start with `0.045`, then preview on desktop and mobile.

Make the radius smaller for tiny, precise structures and larger for broad structures. Avoid making it so large that nearby labels overlap.

## Publishing workflow

```text
Edit label in Studio
→ configure Study/Quiz settings
→ validate
→ export the view JSON
→ replace data/views/<view-id>.json
→ test Study and all quiz types
→ run npm run check
→ commit and publish
```
