# Run: CI pipeline, Testcontainers test DB, 100% unit coverage

- Date: 2026-10-19
- Spec: `.ai/specs/implemented/2026-10-19-ci-pipeline.md`
- Branch / PR: `feat/engineering-standards` / #2

## Goal

GitHub Actions CI for every PR (lint, typecheck, unit + 100% coverage, build, integration on Testcontainers Postgres, agent-browser e2e), unit tests covering 100% of existing code, AGENTS.md rules for coverage and green CI before merge. Verify on PR #2.

## Steps

- Read lessons, engineering-standards spec, test setup and all source files.
- Environment: no Docker in the sandbox, so the Testcontainers path can only run in CI. Local int/e2e runs use a throwaway cluster (`initdb`, port 5433) through `TEST_DATABASE_URL`.
- Slice 2 (unit + coverage): added `@vitest/coverage-v8`; `npm test` = `vitest run --project unit --coverage` with 100% thresholds over `packages/*/src/**/*.{ts,tsx}` (excluding tests and generated migrations). The baseline was 51.6% statements and failed as expected (red). Added unit tests for core DI, `http` interruption, `IsoDateTime` decode, db `mapDbError`/`dbTry`/`withTransaction` (fake EntityManager), `getOrm`/`closeOrm` (spied `MikroORM.init`), `createOrmConfig`, the CLI config, `registerDb`, `baseProperties`, the app container, `runRequest` failure, the health route, pages and layouts, and ui components (`react-dom/server`). The result is 82 tests and 100% on all four metrics.
- Slices 3/4 (test DB): replaced `migrate-test-db.ts` with `test-database.ts`. It uses `TEST_DATABASE_URL` when set, otherwise starts `@testcontainers/postgresql` `postgres:17`, migrates, provides the URL, and stops the container on teardown. `use-test-database.ts` injects the URL into workers. Locally (no Docker) I verified it with a throwaway cluster on port 5433: int passed 5/5 and e2e 3/3. With the shell `DATABASE_URL` pointed at an unreachable host, int still passed 5/5, which proves workers use the injected URL.
- Slice 1 (workflow): `.github/workflows/ci.yml` has the jobs lint, typecheck, unit, build, integration and e2e on Node 24 with the latest action majors (checkout/setup-node/upload-artifact v7). The e2e job runs `npx agent-browser install --with-deps` and then the build.
- Slice 5 (rules): AGENTS.md now has the 100% coverage rule, the "all checks finished + green for latest commit before merge" rule (Always + Never), and the CI/test entries in the task router and Commands. CLAUDE.md summary, README (scripts, env, CI section) and the standards spec's open question are updated.
- ESLint now ignores `coverage/` (the generated HTML report triggered a warning).

## Decisions

- Coverage scope includes `.tsx` pages and components (rendered with `react-dom/server`), so "100% of existing code" holds without excluding UI. The only exclusion is generated migrations.
- Added a separate typecheck job (part of the definition of done, not explicitly requested).
- Testcontainers instead of a GitHub service container: the same code path works locally (with Docker) and in CI.
- Branch protection (follow-up, user request): extended the existing ruleset "Main branch rule" (id 25433382) with `pull_request` (0 approvals, thread resolution, dismiss stale reviews) and `required_status_checks` (six checks, GitHub Actions app 15368, strict/up-to-date). Kept deletion and non-fast-forward. No bypass actors. PR #2 then reported `mergeStateStatus: CLEAN`. Required approvals were left at 0 because the user didn't ask for reviews; raising it is a one-field change.

## Results

- Local: `npm run lint`, `npm run typecheck`, `npm test` (82 tests, 100%) and `NODE_ENV=production npm run build` pass. int 5/5 and e2e 3/3 pass against the throwaway DB.
- CI on PR #2, commit `e044b93` (run 39326045072): all six checks passed. The unit job logged the 100% table. The integration job started Testcontainers (no `TEST_DATABASE_URL`), applied the migration and passed 5 tests. The e2e job passed 3 agent-browser tests.

## Open issues

- npm warns that install scripts are blocked (`ssh2`, `cpu-features`, `protobufjs`, …). Testcontainers works without them in CI.

## Follow-up: test evidence and stage order (user request)

- Evidence: `reporters: ["default", "junit", "github-actions" (CI only)]`. Each script sets `--outputFile.junit=test-results/<unit|int|e2e>/junit.xml`. Coverage also writes `coverage/coverage.txt`, which the unit job appends to its job summary. e2e: a `screenshot()` helper (agent-browser `screenshot --full`) runs at the end of every scenario, plus an `afterEach` failure screenshot. The global setup recreates `test-results/e2e/screenshots` (agent-browser doesn't create directories, so the first run failed with "No such file or directory") and tees the `next start` output to `server.log`. Checked locally: 3/3 pass and the screenshots show the home page, the dashboard with "Connected", and `{"status":"ok"}`. A temporary, uncommitted wrong assertion produced `failed-renders-the-public-home-page.png`, and the file was restored afterwards.
- Order: chained with `needs` into lint/typecheck → unit + build → integration → e2e. e2e downloads the `next-build` tarball instead of rebuilding. Job names are unchanged, so the ruleset needed no change.
- Rules: AGENTS.md now requires an e2e screenshot per scenario and citing evidence when reporting results. The task router has a "Test evidence" row. README and spec are updated.
- First CI run of the new pipeline (39332400800) was green in the intended order, but the downloaded `e2e-evidence` had no `junit.xml`. Cause: the setup's `rmSync(test-results/e2e)` unlinked the file the JUnit reporter had already opened (lesson `junit-reporter-holds-output-file-open`). Fix: clear only `screenshots/`. Also, `coverage.txt` listed the re-export-only `ui/src/lib/utils.ts` as 0%, so it now uses `skipEmpty: true`.
