# Local source-image staging

Place copies of photographs here only while running the MORPHORA conversion tools.
This directory is ignored by Git, except for this guide.

Keep untouched archival masters in a separate, backed-up source archive outside the
public website repository.

Example:

```text
source-images/
└── dog/
    └── cervical-vertebrae/
        ├── dog-cervical-c1-dorsal.jpg
        └── dog-cervical-c1-ventral.jpg
```

Run conversion from the project root:

```bash
python tools/build_deepzoom.py source-images/dog/cervical-vertebrae/dog-cervical-c1-dorsal.jpg \
  --id dog-cervical-c1-dorsal \
  --title "Canine atlas vertebra — dorsal view" \
  --orientation dorsal \
  --alt "Dorsal view of the first cervical vertebra of a dog" \
  --create-view-json
```
