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
- Branch protection (making checks "required" in GitHub) was not changed. It's a repository setting for the owner.

## Results

- Local: `npm run lint`, `npm run typecheck`, `npm test` (82 tests, 100%) and `NODE_ENV=production npm run build` pass. int 5/5 and e2e 3/3 pass against the throwaway DB.
- CI on PR #2, commit `e044b93` (run 39326045072): all six checks passed. The unit job logged the 100% table. The integration job started Testcontainers (no `TEST_DATABASE_URL`), applied the migration and passed 5 tests. The e2e job passed 3 agent-browser tests.

## Open issues

- Configure branch protection on `main` so the six checks are required in GitHub (owner action).
- npm warns that install scripts are blocked (`ssh2`, `cpu-features`, `protobufjs`, …). Testcontainers works without them in CI.
