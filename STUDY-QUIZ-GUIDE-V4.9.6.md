# MORPHORA V4.9.6 — Study & Quiz Guide

## Automatic structure questions

Published labels with `quiz.eligible: true` automatically support:

1. Locate
2. Multiple choice
3. Flashcards

Difficulty and category filters use label metadata already produced by Content Studio.

## Targeted study pools

Quiz setup provides four progress pools:

- **All eligible** — every matching published label
- **Marked for review** — manually or automatically flagged structures
- **Needs practice** — attempted structures below 60% mastery
- **Not studied yet** — structures with no recorded attempts

Difficulty and category can be combined with these pools.

## Authored knowledge questions

Create or edit the collection bank under `data/questions/`.

Example:

```json
{
  "schemaVersion": 1,
  "collectionId": "dog-skull",
  "questions": [
    {
      "id": "question-id",
      "type": "multiple-choice",
      "prompt": "Your authored question",
      "options": ["Correct", "Distractor A", "Distractor B", "Distractor C"],
      "correctIndex": 0,
      "explanation": "Optional feedback after answering.",
      "difficulty": "intermediate",
      "category": "knowledge",
      "status": "published",
      "viewIds": ["dog-skull-lateral"],
      "labelId": "infraorbital-foramen"
    }
  ]
}
```

### Fields

- `id`: stable lowercase hyphenated identifier
- `type`: currently `multiple-choice`
- `prompt`: question shown to the student
- `options`: 2–9 answer options
- `correctIndex`: zero-based index into `options`
- `explanation`: optional post-answer teaching feedback
- `difficulty`: beginner / intermediate / advanced
- `category`: free controlled category string
- `status`: draft / review / published / unpublished
- `viewIds`: empty for every view in the collection, or specific view IDs
- `labelId`: optional related anatomical label; when present MORPHORA can focus/highlight it

Only `published` questions appear in student quizzes.

## Session recovery

Quiz state is persisted during the session. If the browser refreshes or the user navigates away unintentionally, reopening Quiz on the same view offers Resume.

Recovery stores question IDs rather than copying full content, so the live question bank remains authoritative.

## Mastery

Mastery combines:

- lifetime accuracy
- weighted recent performance
- flashcard recall ratings
- correct-answer streak

Recent answers matter more than old answers. Incorrect and difficult recall keep a structure in review; sustained strong recent performance can remove the automatic review flag.

## Review workflow

At the end of a session MORPHORA provides:

- review priorities
- repeat missed
- study-mode review for structure quizzes
- a recommended next step based on session accuracy

Knowledge-question mistakes can be repeated directly; Study-mode review remains structure-specific.
