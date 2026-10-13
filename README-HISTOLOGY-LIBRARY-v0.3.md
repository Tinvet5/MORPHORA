# MORPHORA Histology Library v0.3

This experimental MORPHORA V5.0.5 branch upgrades the Histology proof of concept into a six-slide local whole-slide library.

## Included specimens

- Equine abscessed lymph node — H&E — confirmed histopathology record.
- Bone specimen 01 — biological identification pending.
- Spongy bone / Hueso esponjoso — slide label confirmed; species and stain pending.
- Bone specimen 03 — biological identification pending.
- Decalcified compact bone / Hueso compacto descalcificado — slide label confirmed; species and stain pending.
- Bone specimen 05 — biological identification pending.

## v0.3 changes

- One dynamic OpenSeadragon/PMA.start viewer now loads all six slides by manifest ID.
- Added the Bone collection filter to the Histology library.
- Added five scanner-independent bone slide manifests.
- PMA.start source settings are now stored per slide, preventing one edited path from overriding another specimen.
- Removed the black/shoulder MORPHORA wordmark from the Histology library header.
- Unknown biological fields remain explicitly unconfirmed instead of being inferred.
- Preserved the pink/purple Histology visual identity and the V5.0.5 application foundation.

## Local folders expected

```text
C:/M-HISTOLOGY/48515-2/1.mdsx
C:/M-HISTOLOGY/HUESO/Hueso-1/1.mdsx
C:/M-HISTOLOGY/HUESO/Hueso-2/1.mdsx
C:/M-HISTOLOGY/HUESO/Hueso-3/1.mdsx
C:/M-HISTOLOGY/HUESO/Hueso-4/1.mdsx
C:/M-HISTOLOGY/HUESO/Hueso-5/1.mdsx
```

Keep PMA.start running at `http://127.0.0.1:54001/`, serve MORPHORA through Live Server, authorize the browser origin once if requested, then open any slide from `histology.html`.
