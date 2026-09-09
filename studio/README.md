# MORPHORA Content Studio

Open `studio.html` through a local HTTP server. V4.7 supports both normal image sources and Deep Zoom (`.dzi`) sources.

Normalized anchor and label-box coordinates are independent of image delivery format, so converting a view from JPG to DZI does not require repositioning labels.

Studio remains a static authoring workspace. It saves local drafts and exports JSON, but it does not authenticate users or write directly to GitHub.
