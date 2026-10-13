# MORPHORA V5.0.4.3 — Interaction Hotfix Test Checklist

## Core learning controls
- Open an anatomical view.
- Click **Study**: the Study workspace opens and Study becomes active.
- Click **Quiz**: the quiz setup dialog opens.
- Click **Learning progress**: the progress drawer opens.
- Return to Explore and click **Draw on image**: the drawing toolbar opens and the button becomes active.

## Live Server cache safety
- Launch with VS Code Live Server on `127.0.0.1` or `localhost`.
- Refresh once after opening the hotfix build.
- Confirm the four controls above still work.
- DevTools > Application > Service Workers should not retain an active MORPHORA worker for the local Live Server origin after the cleanup runs.

## Regression
- Sign in/out still works.
- Language/theme cloud preferences still work.
- Notes and bookmarks remain local-first and sync for authenticated users.
- Atlas labels, navigation, search and annotations remain functional.

No new Supabase SQL migration is required for this hotfix.
