# MORPHORA Histology Library v0.5.1

## Personal Histology Labels & Color Coding

Built on the stable Histology Library v0.5 Studio authoring baseline.

### What changed

- Added a Histology-only **My labels** student tool.
- Students/teachers can create personal **point labels** and **polygon color zones** directly on a WSI.
- Personal annotations support:
  - custom title
  - optional category
  - optional study/teaching note
  - eight preset colors plus native custom color picker
  - adjustable polygon fill opacity
  - focus, edit, move/redraw, and delete
- Added independent **Official** and **Mine** structure tabs.
- Official MORPHORA structures and personal annotations can be shown/hidden independently.
- Personal labels render with their chosen color directly on the slide.
- Personal annotations are stored in the account-scoped local Histology workspace for each slide.
- Personal annotations are intentionally **not** written into the official slide manifest and are not included in Histology Studio exports.
- Histology Studio remains the canonical authoring layer for MORPHORA-curated bilingual content.
- Anatomy behavior is unchanged; personal structure labeling is Histology-only.

### Data separation

Official slide structures live in:

`histology/slides/<slide-id>.json`

Personal labels live in the local Histology workspace keyed by MORPHORA principal + slide ID.

This keeps user-authored study material visually and logically separate from canonical MORPHORA labels.

### Current scope

Personal Histology labels are local-only in v0.5.1. Cloud sync/sharing can be added in a later Histology sync milestone.
