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

## Stage order and evidence (revision 2026-10-19, user request)

- **Order by purpose** (jobs chained with `needs`, cheapest and broadest feedback first; a failed stage skips the later ones and saves runner time):
  1. static: `lint`, `typecheck`
  2. `unit` (needs static) and `build` (needs static; it checks the deliverable and doesn't depend on test results)
  3. `integration` (needs `unit`): slower, needs Docker
  4. `e2e` (needs `build` + `integration`): slowest. It runs the `.next` output of the `build` job (artifact `next-build`, packed with `tar` because `.next/node_modules` holds symlinks to the server externals), so e2e tests exactly what passed the build check.
  - Trade-off: wall-clock time grows from about 1.5 to about 4 minutes in exchange for fail-fast feedback. The job names stay the same, so the ruleset's required checks are unchanged. A job skipped because an earlier stage failed never unblocks a merge, because the failed upstream check is itself required.
- **Evidence per test level** (local files under `test-results/` and `coverage/`, gitignored; in CI: Vitest `github-actions` reporter job summary + annotations, and artifacts uploaded with `if: always()`):
  - unit: `test-results/unit/junit.xml`, `coverage/` (HTML report + `coverage.txt`, appended to the job summary) → artifact `unit-evidence`
  - integration: `test-results/int/junit.xml` → artifact `integration-evidence`
  - e2e: `test-results/e2e/junit.xml`, `screenshots/<nn>-<scenario>.png` (one per scenario, plus `failed-<test>.png` on failure), `server.log` (`next start` output) → artifact `e2e-evidence`

## Slices

1. **CI skeleton (lint, typecheck, build)**: workflow with the three jobs. Given a PR, when it is opened or updated, then the three checks run and pass.
2. **Unit tests + 100% coverage gate**: coverage config + tests for all existing code. Given `npm test`, when any covered file drops below 100%, then the command fails (unit job red).
3. **Integration tests on Testcontainers**: given no `TEST_DATABASE_URL`, when `npm run test:int` runs, then a Postgres container starts, migrations apply, the `withTransaction`/`dbTry` int tests pass and the container stops. Given `TEST_DATABASE_URL`, then that database is used instead.
4. **E2E on Testcontainers + agent-browser**: given a build, when `npm run test:e2e` runs without `TEST_DATABASE_URL`, then the app starts against a container database and the smoke tests pass.
5. **AGENTS.md rules**: 100% unit coverage for every feature; all PR checks green on the latest commit before merging.

## Out of scope

Deployment, caching Chrome/Next build output between runs, required review approvals, coverage for `e2e/` helpers and config files outside `src/`.
