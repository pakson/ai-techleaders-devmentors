# Installed OpenMercato scripts must pass repository lint

- Date: 2026-10-20
- Context: Fixing the lint failure reported by PR #3 after committing the installed OpenMercato skills.

## Finding

The upstream `om-share-this-session` scripts did not match this repository's Prettier configuration, and one script imported an unused `tmpdir` symbol.

## Resolution

Removed the unused import and formatted both scripts with the repository's Prettier command. `npm run lint` now passes with no warnings or formatting errors.

## Rule going forward

Run `npm run lint` after installing or updating bundled skills. Format imported scripts using the repository formatter before committing them.
