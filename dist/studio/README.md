# MORPHORA Content Studio

V4.8.4 keeps the V4.8.3 content-pipeline workflow and adds the centralized schema/model layer.

Use `studio.html` through Live Server or another HTTP server. Studio can create single views or image batches, edit view metadata, author labels, recover local drafts and photographs, run publish preflight, and write validated content into a connected local MORPHORA Git repository on compatible Chromium browsers.

## V4.8.4 data behavior

- V1 view JSON can be imported and is migrated in memory.
- Studio works with the shared `MorphoraModels` data layer.
- New exports use canonical schema V2.
- Quiz metadata is written as a nested `quiz` object.
- Collection manifests are normalized before direct publishing.
- Unsupported future schema versions are rejected rather than guessed.

The Studio does not push to GitHub itself. After publishing to the local repository, review and push the resulting files with GitHub Desktop or Git.

Local safety backups created during direct publishing are stored in `.morphora-backups/` and are ignored by Git.
