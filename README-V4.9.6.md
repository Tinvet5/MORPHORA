# MORPHORA V4.9.6 — Study & Quiz Engine Refinement

V4.9.6 builds on V4.9.5 + loading-state hotfix without changing the core atlas, Deep Zoom, Studio, schema v2, persistence layer, visual system, or deployment architecture.

## Highlights

- Difficulty-aware Study filters
- Category-aware Study filters
- Quiz pools filtered by difficulty, category and study status
- Review, weak-structure and unseen-structure pools
- Context-aware multiple-choice distractors
- Interrupted quiz-session recovery
- Weighted recent-performance mastery instead of raw accuracy only
- Correct-answer streak tracking
- Collection-level authored knowledge-question banks
- Knowledge-question progress tracking
- Improved results recommendations
- Existing Locate, Multiple Choice and Flashcard modes preserved

## No data migration required

Existing label quiz metadata remains unchanged:

```json
"quiz": {
  "eligible": true,
  "difficulty": "intermediate",
  "acceptedRadius": 0.035
}
```

Existing learning-progress stores are read normally. New fields such as `history`, `streak` and `customQuestions` are optional extensions inside the existing v2 progress store.

## Study filters

Study mode now supports:

- All / Beginner / Intermediate / Advanced
- Anatomical category
- Text search

The current study counter and navigation operate on the filtered pool.

## Quiz pools

Quiz setup now supports:

- Question type
- Question count
- Difficulty
- Category
- Study pool: all, marked for review, needs practice, not studied yet

`Needs practice` currently means the structure has been attempted and mastery is below 60%.

## Smarter multiple-choice distractors

Distractors are ranked toward the same anatomical category and difficulty as the correct structure, with weaker/review structures given a small relevance boost. Duplicate answer names are removed.

## Session recovery

An active quiz is saved under:

`morphora:quiz-session:v1`

If the page reloads or the atlas is left accidentally, returning to the same anatomical view exposes a Resume card in quiz setup. Explicitly ending or discarding a quiz removes the recovery session.

## Mastery model

V4.9.6 keeps lifetime accuracy but weights recent answers more strongly. Flashcard ratings contribute distinct values, recent performance receives higher weighting, and a correct-answer streak is tracked.

This lets MORPHORA distinguish a structure that was historically weak but has recently improved from one that remains consistently difficult.

## Authored knowledge questions

Custom questions are separate from anatomical label JSON.

Collection manifest:

`data/collections/dog-skull.json`

Question bank:

`data/questions/dog-skull.json`

Only published questions are used. The current dog-skull bank is intentionally empty until authored content is added.

See `STUDY-QUIZ-GUIDE-V4.9.6.md` and `data/questions/QUESTION-BANK-TEMPLATE.json`.

## Validation

The project validator now validates question-bank schemas, duplicate question IDs, answer indexes, referenced view IDs and option duplication warnings.

Run:

```bash
npm run check
```

V4.9.6 also adds:

```bash
npm run check:study
```

## Local preview

Use Live Server and test:

- `/`
- `/studio.html`
- `/dev-tools.html`

## Deployment

Keep the repository `CNAME`, review changes in GitHub Desktop, commit, push, then verify the validation-gated deployment workflow.
