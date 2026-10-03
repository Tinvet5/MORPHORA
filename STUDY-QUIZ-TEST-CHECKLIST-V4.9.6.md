# MORPHORA V4.9.6 — Study & Quiz Test Checklist

## Study filters
- [ ] Difficulty filter changes the study pool
- [ ] Category filter changes the study pool
- [ ] Search combines correctly with both filters
- [ ] Previous/Next cycles only through filtered structures
- [ ] Reveal all affects only the filtered pool

## Quiz filters
- [ ] Difficulty filter updates eligibility count
- [ ] Category filter updates eligibility count
- [ ] Marked-for-review pool works
- [ ] Needs-practice pool selects attempted structures below 60% mastery
- [ ] Not-studied pool selects unattempted structures
- [ ] Question count never exceeds eligible pool size

## Multiple choice
- [ ] Same-category distractors are preferred when available
- [ ] Same-difficulty distractors are preferred when available
- [ ] Duplicate answer names are not displayed
- [ ] Numeric keyboard shortcuts work

## Session recovery
- [ ] Start quiz, answer at least one question, refresh
- [ ] Quiz setup offers Resume on the same view
- [ ] Resume continues from the next unanswered item
- [ ] Explicit End session removes recovery state
- [ ] Discard removes recovery state
- [ ] Completed sessions are not offered for resume

## Mastery
- [ ] Recent correct answers can improve mastery faster than old failures
- [ ] Recent failures reduce mastery
- [ ] Correct streak appears in Study status
- [ ] Weak pool updates after mastery changes
- [ ] Review flag remains after incorrect/difficult recall

## Custom question bank
- [ ] Knowledge option is disabled when no published questions exist
- [ ] Add a published test question to `data/questions/dog-skull.json`
- [ ] Knowledge option becomes available
- [ ] `viewIds` limits availability correctly
- [ ] `labelId` highlights related structure when valid
- [ ] Correct answer and explanation display correctly
- [ ] Repeat missed works for knowledge questions

## Regression
- [ ] Locate quiz
- [ ] Structure multiple choice
- [ ] Flashcards
- [ ] Notes
- [ ] Drawings
- [ ] Deep Zoom view switching
- [ ] Focus View
- [ ] Content Studio
