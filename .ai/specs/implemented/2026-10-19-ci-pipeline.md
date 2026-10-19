# CI pipeline (GitHub Actions), 100% unit coverage, ephemeral test database

- Date: 2026-10-19
- Status: implemented (2026-10-19, PR #2)
- Related: `implemented/2026-10-19-engineering-standards.md` §11 (testing) and §14 (open question "CI pipeline")

## Goal

Every pull request runs the definition-of-done gate in GitHub Actions and must be green before it is merged:

1. **Lint**: `npm run lint` (ESLint + Prettier).
2. **Typecheck**: `npm run typecheck` (tsc + Effect diagnostics). Not explicitly requested, but it is part of the existing definition of done and costs one job.
3. **Unit tests**: `npm test` (Vitest `unit` project) with a **100% coverage** threshold (lines, branches, functions, statements).
4. **Build**: `npm run build` (`NODE_ENV=production`, no database).
5. **Integration tests**: `npm run test:int` against a throwaway PostgreSQL started by **Testcontainers**.
6. **E2E tests**: `npm run build` + `npm run test:e2e`: the built app runs against a Testcontainers PostgreSQL and is driven with **agent-browser**.

## Decisions

- **One workflow** `.github/workflows/ci.yml`, triggered on `pull_request` and on `push` to `main`. One job per check, so each shows up as its own status check (`lint`, `typecheck`, `unit`, `build`, `integration`, `e2e`). A new push cancels the previous run of the same PR (`concurrency`).
- **Node 24** on `ubuntu-latest`, `npm ci` with the npm cache. `NEXT_TELEMETRY_DISABLED=1`.
- **Ephemeral database (Testcontainers)**: a Vitest global setup (`packages/db/src/__tests__/test-database.ts`) uses `TEST_DATABASE_URL` when it is set (unchanged local workflow); otherwise it starts `postgres:17` with `@testcontainers/postgresql`, applies all migrations and stops the container after the run. Test workers receive the URL through Vitest `provide`/`inject` (setup file `use-test-database.ts`), so the shell's `DATABASE_URL` is never used by tests. GitHub-hosted Ubuntu runners have Docker, so CI needs no service container.
- **agent-browser in CI**: `npx agent-browser install --with-deps` (Chrome + system libraries; lesson `agent-browser-linux-deps-and-process-groups`).
- **Coverage**: `@vitest/coverage-v8`. `npm test` always collects coverage and fails under 100%, so the local gate and CI are the same command. Scope: all source in `packages/*/src/**/*.{ts,tsx}` except tests and generated MikroORM migrations (`packages/db/src/migrations/`, exercised by the integration and e2e runs). React components and pages are rendered with `react-dom/server` in unit tests.
- **New dev dependencies** (root): `@vitest/coverage-v8` (coverage), `@testcontainers/postgresql` (ephemeral Postgres). Both are needed by the requested features.
- **Merge rule**: AGENTS.md requires that all checks have finished and are green **for the PR's latest commit** before merging (`gh pr checks <n> --watch`, confirming the head SHA). The existing ruleset "Main branch rule" (default branch; already blocked deletion and force-push) now also requires a pull request (0 approvals, review threads resolved, stale approvals dismissed) and the six status checks from GitHub Actions (`integration_id` 15368) on a branch that is up to date with `main`. It has no bypass actors. Added 2026-10-19 at the user's request.

## Slices

1. **CI skeleton (lint, typecheck, build)**: workflow with the three jobs. Given a PR, when it is opened or updated, then the three checks run and pass.
2. **Unit tests + 100% coverage gate**: coverage config + tests for all existing code. Given `npm test`, when any covered file drops below 100%, then the command fails (unit job red).
3. **Integration tests on Testcontainers**: given no `TEST_DATABASE_URL`, when `npm run test:int` runs, then a Postgres container starts, migrations apply, the `withTransaction`/`dbTry` int tests pass and the container stops. Given `TEST_DATABASE_URL`, then that database is used instead.
4. **E2E on Testcontainers + agent-browser**: given a build, when `npm run test:e2e` runs without `TEST_DATABASE_URL`, then the app starts against a container database and the smoke tests pass.
5. **AGENTS.md rules**: 100% unit coverage for every feature; all PR checks green on the latest commit before merging.

## Out of scope

Deployment, caching Chrome/Next build output between runs, required review approvals, coverage for `e2e/` helpers and config files outside `src/`.
