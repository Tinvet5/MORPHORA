# MORPHORA V4.9.7 — Content Discovery & Multilingual Test Checklist

Use this checklist after extracting the release package and before deployment.

## Automated checks

- [ ] Run `npm run check`.
- [ ] Confirm i18n test reports matching ES/EN UI dictionary keys.
- [ ] Confirm Dog Skull bilingual label check passes.
- [ ] Confirm validation reports 0 errors.
- [ ] Confirm the only expected project warning is the missing cervical starter photograph.
- [ ] Run `npm run release:verify` when validating a release artifact.

## Public language switching

- [ ] Open `/` with Live Server.
- [ ] Verify the header language control shows ES/EN.
- [ ] Switch ES → EN without reloading the page.
- [ ] Verify home/species/library interface text changes.
- [ ] Open Dog Skull and verify the active view title/button labels localize.
- [ ] Verify anatomical label names and descriptions localize.
- [ ] Switch EN → ES while the same anatomical view is open.
- [ ] Verify the same hotspot IDs/positions remain unchanged.
- [ ] Refresh and confirm the manually selected language persists.

## Global Content Discovery

- [ ] Search for a Spanish structure name.
- [ ] Search for the equivalent English name.
- [ ] Search a configured alias where available.
- [ ] Search optional Latin terminology where available.
- [ ] Confirm each result resolves to the same underlying structure ID.
- [ ] Select a structure result and verify MORPHORA opens the correct view.
- [ ] Verify the target hotspot is focused/selected after navigation.

## In-view search

- [ ] Search the current view using its displayed language.
- [ ] Confirm autocomplete results use localized names.
- [ ] Select a result and verify pan/zoom + inspector behavior remains correct.
- [ ] Switch language and repeat without refreshing.

## Study & Quiz

- [ ] Enter Study mode in Spanish and verify localized structure names.
- [ ] Change to English and verify Study content updates.
- [ ] Start Locate quiz and confirm localized prompts/label names.
- [ ] Start Multiple Choice and confirm answer labels use the active locale.
- [ ] Start Flashcards and confirm localized structure content.
- [ ] Verify mastery/progress remains the same when language changes.
- [ ] If testing an authored bilingual question, verify prompt/options/explanation switch correctly.

## Studio multilingual authoring

- [ ] Open `/studio.html`.
- [ ] Load an existing Dog Skull view.
- [ ] Select an existing label.
- [ ] Switch content language between Español and English.
- [ ] Verify language-specific name/description/aliases are shown.
- [ ] Verify translation-completion status updates.
- [ ] Edit an English alias and save/export.
- [ ] Confirm ID, position, label position, category and quiz metadata are unchanged.
- [ ] Edit the Spanish source name/description and confirm legacy `name`/`description` synchronize.
- [ ] Reload/import the exported JSON and confirm both translation blocks survive.

## Regression checks

- [ ] Switch Lateral → Ventral → Dorsal → Cranial → Caudal and confirm the V4.9.5 loading-screen hotfix still prevents flashing.
- [ ] Verify Focus View works.
- [ ] Verify labels toggle works.
- [ ] Verify notes persist.
- [ ] Verify drawing layer persists.
- [ ] Verify quiz-session recovery works after refresh.
- [ ] Verify Deep Zoom navigator/zoom/pan behave normally.
- [ ] Verify mobile toolbar and structure bottom sheet remain usable.

## Deployment

- [ ] Preserve the existing repository `CNAME`.
- [ ] Review GitHub Desktop changes.
- [ ] Commit V4.9.7 to `main`.
- [ ] Push origin.
- [ ] Confirm GitHub Actions validation/deployment succeeds.
- [ ] Hard-refresh `morphora.cl` and verify the language control and global structure search in production.
