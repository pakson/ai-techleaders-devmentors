# Test workers must get the test database URL injected; the shell DATABASE_URL hides mistakes

- Date: 2026-10-19
- Context: CI pipeline (Testcontainers test database), spec `implemented/2026-10-19-ci-pipeline.md`

## Finding
The test database URL is only known after the Vitest global setup has started a Testcontainers PostgreSQL, so it can't be put in the config's `test.env`. Setting `process.env` in a global setup isn't a reliable way to reach the test workers. If a worker falls back to the shell's `DATABASE_URL` (the shared `open-mercato` DB in the sandbox, which also has a `users` table), the int tests still pass while writing to the wrong database.

## Resolution
The global setup (`packages/db/src/__tests__/test-database.ts`) calls `project.provide("databaseUrl", url)`, and a `setupFiles` entry (`use-test-database.ts`) sets `process.env.DATABASE_URL = inject("databaseUrl")` in every worker. To verify, run `test:int` with `DATABASE_URL` pointing at an unreachable host. The tests must still pass.

## Rule going forward
Pass per-run values from a global setup to workers with `provide`/`inject`, never through mutated `process.env`. When a test must not touch a database, prove it by pointing the shell's `DATABASE_URL` at an unreachable host.
