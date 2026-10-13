# MORPHORA Histology Library v0.6

## Study & Quiz

Built on the stable Histology Library v0.5.1 personal-label baseline.

### What changed

- Activated **Study** and **Quiz** in the Histology student workspace.
- Learning content can come from:
  - **MORPHORA Official** structures
  - **My Labels** personal annotations
  - **Both** layers together
- Added active-recall Study workflow:
  - one structure at a time
  - answer hidden until Reveal
  - mark each item as **Learning** or **Known**
  - per-slide, per-principal persistence
- Added Quiz workflow with:
  - **Mixed** questions
  - **Multiple choice** identification
  - **Locate on slide** questions
  - 5, 10, or all available items
- Locate mode keeps normal OpenSeadragon pan/zoom active and grades:
  - point annotations by click proximity
  - polygon regions by point-in-polygon hit testing
- Added a dedicated learning target overlay that hides normal labels during active recall.
- Added learning-progress statistics:
  - Known
  - Learning
  - overall quiz accuracy
  - Locate accuracy
- Quiz history is stored locally in the Histology workspace.
- Personal-label quiz results remain clearly identified as personal practice and are not presented as validated MORPHORA assessment.
- Official and personal content remain separate throughout Study, Quiz, Studio and export.

### Workspace schema

Histology local workspace schema is now version 3 and adds:

- `studyProgress`
- `quizHistory`

Existing notes, bookmarks, drawings and personal labels from v0.5.1 are preserved.

### Current scope

Study/Quiz progress remains local-only in v0.6. Histology cloud sync is reserved for the next sync milestone.
