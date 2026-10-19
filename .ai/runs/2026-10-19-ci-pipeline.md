# Run: CI pipeline, Testcontainers test DB, 100% unit coverage

- Date: 2026-10-19
- Spec: `.ai/specs/2026-10-19-ci-pipeline.md`
- Branch / PR: `feat/engineering-standards` / #2

## Goal

GitHub Actions CI for every PR (lint, typecheck, unit + 100% coverage, build, integration on Testcontainers Postgres, agent-browser e2e), unit tests covering 100% of existing code, AGENTS.md rules for coverage and green CI before merge. Verify on PR #2.

## Steps

- Read lessons, engineering-standards spec, test setup and all source files.
- Environment: no Docker in the sandbox, so the Testcontainers path can only run in CI. Local int/e2e runs use a throwaway cluster (`initdb`, port 5433) through `TEST_DATABASE_URL`.
