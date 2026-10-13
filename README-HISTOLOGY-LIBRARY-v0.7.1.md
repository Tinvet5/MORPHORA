# MORPHORA Histology Library v0.7.1

## Workspace Layout Hotfix

This focused release keeps the full v0.7 Cloud Sync & Account Integration feature set and fixes the Histology viewer/sidebar sizing reported on desktop and laptop-height browser windows.

### What changed

- The desktop Histology shell is explicitly clamped to the usable dynamic viewport (`100dvh`, with `100vh` fallback).
- The main workspace can no longer expand beyond the remaining grid row beneath the Histology header.
- The left student workspace now owns its own vertical scroll area instead of being clipped below the browser viewport.
- Bottom padding is preserved, including safe-area inset support, so the final progress/tools content does not disappear against the viewport edge.
- The central whole-slide viewer column is also clamped to the workspace height to prevent the navigator/toolbar from forcing page overflow.
- Mobile behavior remains document-scroll based: below 820 px the fixed desktop height is released and normal vertical page flow is restored.
- No Histology learning, Studio, personal-label, cloud-sync, database, or slide-manifest behavior changed.

### Regression scope

Validate the viewer at common laptop/desktop heights, including short windows, then verify Notes, Draw, My Labels, Study, Quiz, Studio, Developer panel, cloud status, navigator and fullscreen behavior.

### Backend

No SQL migration is required. v0.7.1 is a presentation/layout-only hotfix over the v0.7 sync architecture.
