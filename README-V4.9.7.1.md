# MORPHORA V4.9.7.1 — Translation Completeness & Brand Footer

A focused refinement of V4.9.7. It does not alter anatomy geometry, schemas, Study/Quiz IDs, Deep Zoom assets, or user-data formats.

## Highlights
- Expanded Spanish/English UI coverage across discovery, atlas states, notes, drawings, Study/Quiz, and Content Studio.
- Extended automatic i18n handling to leaf links, summaries, placeholders, ARIA labels, and titles.
- Converted major dynamically generated public messages to explicit i18n keys.
- Added a branded MORPHORA home footer with Email, YouTube, Instagram, and TikTok links.
- Footer copyright: `© 2026 MORPHORA All rights reserved`.
- Centralized public links in `MORPHORA_CONFIG.publicLinks`.
- Strengthened `npm run check:i18n` with V4.9.7.1 coverage guards.

## Public links
- Email: ADMIN@MORPHORA.cl
- YouTube: https://www.youtube.com/channel/UC7rGvkF_5lHKdIq9uqSneuw
- Instagram: https://www.instagram.com/morphora.atlas/?hl=en
- TikTok: https://www.tiktok.com/@morphora_atlas?is_from_webapp=1&sender_device=pc

## Compatibility
No content migration is required. Existing V4.9.7 bilingual anatomy, notes, drawings, learning progress, Studio drafts, and question banks remain compatible.

## Validation snapshot
- UI translation parity: 523 matched ES/EN keys
- Bilingual anatomical labels: 12
- Project validation: 0 errors, 1 expected warning
- Deep Zoom: 2,605 tiles / 6.97 MiB / 0 performance warnings
- Release artifact verification: passed

The single warning remains the intentionally absent `dog-cervical-c1-dorsal` starter photograph.
