# The sandbox has no Docker; Testcontainers runs only in CI

- Date: 2026-10-19
- Context: CI pipeline. The user confirmed this is a known sandbox limitation.

## Finding
`docker` is not installed in the agent sandbox, so `npm run test:int` / `test:e2e` without `TEST_DATABASE_URL` (the Testcontainers path) can't run locally. GitHub-hosted runners have Docker, so CI covers that path.

## Resolution
Locally, start a throwaway cluster (`/usr/lib/postgresql/17/bin/initdb -D /tmp/pgci -U postgres --auth=trust`, `pg_ctl -D /tmp/pgci -o "-p 5433 -k /tmp" start`, `createdb -h 127.0.0.1 -p 5433 -U postgres devmentor_ci_test`) and run the tests with `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/devmentor_ci_test`. Then rely on the PR's `integration` / `e2e` checks for the Testcontainers path.

## Rule going forward
Don't treat missing Docker as a problem or ask the user about it. Verify DB tests locally through `TEST_DATABASE_URL`, and verify the Testcontainers path through CI.
