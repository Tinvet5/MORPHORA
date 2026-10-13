# Histology Library v0.3 test checklist

- [ ] Histology home shows 6 slides.
- [ ] Black/shoulder MORPHORA wordmark is absent from Histology header.
- [ ] Bone collection filter shows Hueso-1 through Hueso-5.
- [ ] Histopathology filter shows the equine abscessed lymph node.
- [ ] Search finds “Hueso esponjoso” / “Spongy bone”.
- [ ] Search finds “Hueso compacto descalcificado” / “Decalcified compact bone”.
- [ ] Hueso-1, Hueso-3, and Hueso-5 are marked identification pending.
- [ ] Each card opens the same `histology-poc.html` viewer with a different `?slide=` ID.
- [ ] Each slide loads its own PMA.start path and metadata.
- [ ] Editing the source path for one slide does not change another slide.
- [ ] Language and theme switches work in library and viewer.
- [ ] Lymph-node H&E viewer still connects and streams tiles.
- [ ] All five bone viewers connect and stream tiles.
