# Histology Library v0.6 Test Checklist

## Study
- Create at least two personal labels or author official structures in Histology Studio.
- Open **Study**.
- Verify Official, Mine and Both show correct item counts and unavailable sources are disabled.
- Start a session and confirm normal labels disappear while the anonymous target remains highlighted.
- Click **Reveal** and confirm name/description/source appear.
- Mark one item **Learning** and another **Known**.
- Reload and confirm progress persists.

## Quiz — multiple choice
- Open **Quiz → Multiple choice** with at least two distinct labels.
- Confirm the target is highlighted without its name.
- Choose a wrong answer and verify the correct answer is identified.
- Choose a correct answer on another question.
- Complete the session and verify score summary and Quiz accuracy update.

## Quiz — Locate
- Open **Quiz → Locate**.
- Confirm the prompt names the target but no target marker is shown before answering.
- Pan/zoom the WSI normally.
- For a point label, click close to the target and confirm correct grading.
- For a polygon label, click inside the region and confirm correct grading; click outside and confirm incorrect grading.
- Verify Locate accuracy updates after completion.

## Source separation
- Run a session using **MORPHORA Official** only.
- Run a session using **My Labels** only.
- Run a session using **Both**.
- Confirm the UI identifies the content source.
- Confirm personal-label quiz results are described as personal practice, not validated MORPHORA assessment.
- Confirm personal labels still never appear in Studio manifest export.

## Regression
- Drawing still works and remains slide-anchored.
- Notes/bookmarks still persist.
- My Labels point/region authoring still works.
- Histology Studio point/polygon authoring still works.
- PMA.start and all six slide manifests still work.
- Anatomy behavior is unchanged.
