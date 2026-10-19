# Vitest's JUnit reporter opens its output file before global setup; don't delete that directory

- Date: 2026-10-19
- Context: CI test evidence (spec `implemented/2026-10-19-ci-pipeline.md`)

## Finding
The e2e global setup cleared `test-results/e2e/` with `rmSync` to start with fresh screenshots. The run still printed "JUNIT report written to …/junit.xml", but the file was missing locally and in the CI artifact. The JUnit reporter opens the file descriptor in `onInit`, before global setups run. The `rmSync` unlinked the open file, so the report went into a deleted inode.

## Resolution
Clear only the subfolder that needs a fresh state (`test-results/e2e/screenshots/`). Leave the directory that holds reporter output alone.

## Rule going forward
Never delete or recreate a reporter's output directory from a global setup or test. After changing evidence/reporting, check the files themselves (`find test-results`, the downloaded CI artifact), not just the log line.
