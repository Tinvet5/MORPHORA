# MORPHORA V5.0.4.5 — Study & Quiz Progress Cloud Sync

V5.0.4.5 extends MORPHORA's local-first account synchronization to learning progress and completed quiz history.

## Behavior
- Guest users remain fully local.
- Signed-in users save Study progress locally first, then synchronize to `user_documents`.
- Study mastery is merged conservatively across devices so a newer device cannot erase more advanced valid progress.
- Completed Quiz sessions are stored as independent `quiz_history` documents keyed by session ID, so histories merge additively rather than replacing one another.
- Clearing Learning Progress emits cloud tombstones for the progress root and known quiz-history documents.
- Active/in-progress Quiz sessions remain local to the current device; only completed sessions sync.

## Supabase
No new SQL migration is required. `learning_progress` and `quiz_history` were already allowed document types in the V5.0.4 sync foundation.
