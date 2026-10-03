# V4.9.7.1 Translation Completeness Test Checklist

## Public app
- [ ] Switch ES → EN → ES without reloading.
- [ ] Home hero, species library, footer, and social accessibility labels switch cleanly.
- [ ] Species hub loading/count/status copy switches cleanly.
- [ ] Atlas loading/error/search states switch cleanly.
- [ ] Notes empty states/actions switch cleanly; user-authored note text remains unchanged.
- [ ] Drawing hints/visibility copy switch cleanly.
- [ ] Study filters, counters, empty states, and mastery copy switch cleanly.
- [ ] Quiz setup, resume copy, feedback, recommendations, and progress copy switch cleanly.

## Brand footer
- [ ] Email opens ADMIN@MORPHORA.cl.
- [ ] YouTube opens the MORPHORA channel.
- [ ] Instagram opens morphora.atlas.
- [ ] TikTok opens morphora_atlas.
- [ ] Copyright reads exactly: © 2026 MORPHORA All rights reserved.
- [ ] Footer remains readable in light/dark mode and narrow mobile layouts.

## Studio
- [ ] Open Studio after selecting Spanish in the public app; major Studio chrome appears in Spanish.
- [ ] Switch the public UI back to English and reload Studio; major Studio chrome appears in English.
- [ ] Content-language selector remains independent of UI language.
- [ ] Existing bilingual label content and shared coordinates remain unchanged.

## Regression
- [ ] Run `npm run check:i18n`.
- [ ] Run `npm run check`.
- [ ] Run `npm run release:verify`.
