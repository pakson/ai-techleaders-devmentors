# PR #7 installer specification fixes

- Goal: fix all review findings against `.ai/specs/2026-10-20-devmentor-installer.md` using om-root-cause → om-fix; issue #5, PR #7, starting head b248949.
- Worktree: `/tmp/devmentor-pr7-review`, branch `fix/pr7-installer-spec`. Existing `/workspace` changes preserved. No commit/push under om-fix.
- Root-cause brief: validated URL not passed to migration child; terminal flag missing; Windows .cmd files spawned without shell; redaction applied before whole lines arrive; hidden dependency lock marker masks broken trees; integration global setup pre-migrates the database; minimum-version/Windows CI evidence missing.
- User authorized a compatibility CI check and matching ruleset update. No other settings change authorized.

## Slices and acceptance criteria

1. Safe CLI: given conflicting environment files, migration receives exactly the checked URL; given a TTY, confirmation runs; given stale dependencies, npm reconciles actual state; given chunked output, credentials stay redacted; Windows launches npm's JS entry via Node. Unit regression tests and dependency-free real CLI smoke.
2. Migration proof: first run applies initial migration; repeat preserves rows/ledger; later run discovers exactly one added migration. Disposable-schema integration test with real root migration command.
3. Verification: exact Node 22.17/Linux and Windows compatibility CI; full configured local gate, integration/E2E on task-owned DB; final diff/spec review. Move spec only when implementation/evidence complete.

## Red → green

- Added URL pinning, dependency reconciliation and streamed-redaction regressions; each failed for missing behavior. Initial TTY regression used an unavailable Vitest helper; corrected test setup to temporarily define and restore the terminal property before verifying behavior.
- Production changes make targeted tests pass (34 tests initially); added real npm JS entry-point test and dependency-free real CLI smoke (fresh/repeat, conflicting production env file, no installed dependencies).
- Existing test expectations changed for the corrected requirement: npm install always reconciles the tree rather than trusting a hidden lock marker. No failing behavior assertions weakened.
- First full unit run: 117 tests passed but coverage gate failed (installer interruption branch and existing mapCause typed-error branch uncovered); adding meaningful cases, no threshold changes.

## Validation

Pending final gate and integration/E2E. Local Node is the installed runtime; compatibility CI has not run for these uncommitted changes.

## Additional verified corrections

- Final independent audit reproduced valid quoted/unquoted dotenv inline comments failing or altering the database name. Regression failed first; replaced manual parsing with Node `util.parseEnv`. Updated the old inline-text assertion because dotenv comments are not part of a value; preserved literal quoted `#` behavior.
- Installed MikroORM CLI also reads MIKRO_ORM_CLIENT_URL/HOST/PORT/DB_NAME. Regression confirmed these could override DATABASE_URL. Migration child now pins all four target settings to the validated URL tuple.
- Environment filesystem failures now return a redacted actionable failure; exclusive env-file creation prevents overwriting a concurrently created file. Regression confirmed prior uncaught error.
- Dependency command interruption stops dependent work even if a runner reports zero; original npm install nonzero status is retained.
- Existing http cause-mapping test added for its typed-error public result, closing a coverage gap without changing production HTTP behavior.

## Verification environment and current results

- Initial typecheck resolved workspace exports through the original checkout; replaced external internal-package links with worktree-local links. Typecheck passed afterward.
- Initial build could not resolve Next because Turbopack refuses symlinks outside its root. Installed unchanged locked dependencies locally with npm ci; production build passed. No package/lock changes or project dependency additions.
- Unit evidence initially 120 tests, 100% all four metrics; final run pending after parser/ORM override regressions.
- Exact Node 22.17 CLI smoke passed; final rerun pending after final edits.
- E2E: 3 tests passed with agent-browser against task-owned PostgreSQL; screenshots in test-results/e2e/screenshots/01-home-page.png, 02-backend-dashboard-connected.png, 03-health-endpoint.png; JUnit in test-results/e2e/junit.xml.

## Publication handoff

- om-fix does not commit, push, or open PRs. Changes stay in fix/pr7-installer-spec, based on PR #7 head b248949.
- Compatibility CI introduces required contexts `installer compatibility (ubuntu-latest)` and `installer compatibility (windows-latest)`.
- Authorized ruleset update prepared at /tmp/pr7-ruleset-proposed.json from ruleset 25433382, preserving all prior protections/checks. Apply against a fresh read when om-open-pr publishes the matching workflow; applying now would block unrelated PRs on checks not yet available on GitHub. No live ruleset mutation has been made.
- AGENTS.md changes only the fixed check count to “all configured CI checks” to remain accurate when the authorized compatibility checks are published. Authorization and implementation delta are recorded in the installer spec.
- Spec remains active until all required implementation and verification evidence, including Windows CI, is available. Do not claim the uncommitted changes have passed GitHub CI.

## Completed migration proof

The integration regression failed on the original implementation before spawning an unconfirmed target. The corrected test passes through the real root MikroORM command with NODE_ENV=production, a conflicting .env.production.local and conflicting MIKRO_ORM target variables. A unique temporary schema starts with an empty ledger; the first run applies Migration202610200001, the second is a no-op, and the third applies newly created Migration202610200002. A sentinel row and the two-entry ledger survive. All 6 integration tests pass; evidence: test-results/int/junit.xml. No application schema or applied migration changed.

## Final local gate — PASS

- `npm run lint`: PASS (ESLint and Prettier).
- `npm run typecheck`: PASS (all four workspaces, Effect diagnostics clean).
- `npm test`: PASS, 122 tests in 18 files; 32 source files fully covered; statements 355/355, branches 172/172, functions 127/127, lines 332/332 (100% each). Evidence: test-results/unit/junit.xml and coverage/coverage.txt.
- `NODE_ENV=production npm run build`: PASS, Next 16.4.2 Turbopack.
- `npm run test:int` with task-owned TEST_DATABASE_URL: PASS, 6 tests in 2 files. Evidence: test-results/int/junit.xml; real fresh/repeat/later migration sequence.
- `npm run test:e2e` with task-owned TEST_DATABASE_URL: PASS, 3 tests; JUnit and all 3 asserted-state screenshots retained in test-results/e2e/.
- Exact Node 22.17.0 dependency-free CLI smoke: PASS after final production changes (1 scenario; two setup invocations).
- `git diff --check`: PASS.

Remaining external evidence: Windows compatibility CI and all current-head GitHub checks after publication. No commit, push, PR review, merge or live settings mutation performed. Source spec remains active, awaiting that verification before movement to implemented/. The authorized settings payload is a handoff artifact; fetch and compare the ruleset again before applying it alongside the published compatibility workflow.

Status: ready for om-open-pr; issue #5 claim retained by om-fix as required. Fix branch: fix/pr7-installer-spec. Worktree: /tmp/devmentor-pr7-review.

## Publication authorized

The maintainer requested committing these changes to existing PR #7. Remote PR head was rechecked at b248949; no other changes have been added. Publishing with a normal fast-forward push to feat/issue-5-devmentor-installer, reusing PR #7. The configured local gate and applicable integration/E2E checks passed on these production changes. The approved compatibility requirements will be added to the freshly read ruleset after workflow publication; all existing requirements remain intact. Windows and current-head CI are still pending until GitHub runs them.
