# MORPHORA V4.9.8 — Release Candidate / Production Audit

V4.9.8 is the final V4.x release-candidate hardening pass. It intentionally avoids new learning features or content-schema changes and instead strengthens production safety, accessibility, localization, deployment validation, and runtime resilience.

## What changed

- Added an automated release-candidate quality gate (`tools/release_candidate_audit.py`).
- The full `npm run check` now verifies duplicate IDs, semantic landmarks, ARIA/form targets, image alt attributes, explicit button types, external-link safety, runtime/cache version consistency, bilingual dictionary parity, service-worker shell integrity, reduced-motion/safe-area safeguards, and public link configuration.
- `npm run release:verify` now runs the V4.9.8 quality gate before building and validating `dist/`.
- Release metadata records both normal project validation and release-candidate gate status; production builds are blocked unless both pass.
- Corrected the atlas viewer landmark so the application contains one canonical `<main>` landmark instead of a nested second `<main>`.
- Upgraded the language menu keyboard interaction: Arrow Up/Down, Home, End, and Escape now follow its `menuitemradio` semantics.
- Localized connection-state messaging, compatible-image fallback messaging, navigation error titles, and theme-toggle accessible labels in English and Spanish.
- Prevented the offline monitor from announcing “Connection restored” on an ordinary online page load.
- Made the compatible-image badge runtime-localizable instead of hard-coded in CSS.
- Hardened navigation error rendering by using DOM/textContent instead of interpolating runtime error text into `innerHTML`.
- Theme handling now sets the browser `color-scheme`, respects the operating-system theme until the user explicitly chooses a theme, and refreshes its accessible label after a language change.
- Added `rel="noopener noreferrer"` to all new-tab links in Studio and Developer Diagnostics.

## Compatibility

No migration is required. V4.9.8 keeps schema version 2, user-data schema version 2, existing atlas IDs, coordinates, Deep Zoom assets, notes, drawings, learning progress, Studio drafts, and question-bank formats unchanged.

## Validation status

The automated V4.9.8 suite passes with zero code/audit errors. Project content validation retains one known non-blocking warning for the intentionally absent starter image `images/dog/vertebral-column/cervical/dog-cervical-c1-dorsal.jpg`.

See `RELEASE-CANDIDATE-TEST-CHECKLIST-V4.9.8.md` for final manual QA before tagging/deploying the release candidate.
