# Agent pipeline setup

- Date: 2026-10-20
- Goal: configure the explicitly invoked om-setup-agent-pipeline for DevMentor.
- Related specifications: implemented monorepo architecture, engineering standards and CI pipeline specs dated 2026-10-19; [implemented setup spec](../specs/implemented/2026-10-20-agent-pipeline-setup.md).
- Status: configured and verified; user authorized the setup commit.

## Approved continuation

- User confirmed all proposals and requested the default setup.
- Installed the approved config, SDLC, code-review and backward-compatibility documents, and the shipped GitHub/agent-browser descriptors. Preserved existing agent instructions.
- Added missing analysis/scripts/QA placeholders and ignore entries for QA artifacts, environment state and credentials. Existing runs/specs placeholders remain intact.
- Saved the approved setup specification under `.ai/specs/2026-10-20-agent-pipeline-setup.md`.

## Initial detection and preview evidence

- Read the installed setup skill and required setup, provider, document, interview, capability, coverage and reporting references.
- Read AGENTS.md, CLAUDE.md, lessons and relevant lesson details. Inspected npm workspace scripts, CI workflow, exported package paths, health schemas, error handling, configuration and entity contracts.
- Delegated an independent read-only contract inventory as requested by AGENTS.md's breadth guidance. No agent changed application source.
- Initial default-sandbox commands failed before execution with a bwrap network-namespace error. Read-only checks succeeded with approved escalation.
- GitHub repo/default-branch operation confirmed main. Paginated list-labels returned ten existing labels; bug and documentation already satisfy taxonomy entries. The proposed full taxonomy plus the human-only do-not-close label would require 25 missing labels. No labels have been created or modified.
- Cross-skill coverage check completed with SKILL_COVERAGE_OK, including explicit reference-file checks.
- Environment checks: Node 24.21.0, npm 11.19.0, gh 2.65.0, jq missing, node_modules present. GitHub reads succeeded using gh's embedded --jq. The descriptor recommends gh >=2.82.1 and requires jq for its shell helpers; these remain prerequisite gaps.

## Proposed decisions

- Automatic base branch, GitHub tracker and agent-browser provider.
- Validation in CI order: npm run lint; npm run typecheck; npm test; NODE_ENV=production npm run build; npm run test:int; npm run test:e2e.
- Full labels, QA gate enabled, default .ai paths, no extra review checklist or closing keywords. Existing instruction files remain authoritative.
- Generate missing SDLC.md, CODE_REVIEW.md and BACKWARD_COMPATIBILITY.md from the actual repository. Render the supplied SDLC template with delivery-only blocks and stronger existing latest-head CI rules.
- All config and process-document previews are under `/tmp/devmentor-pipeline-preview.cXbVkn/`; no pipeline config or process docs have been installed yet.

## Initial preview files and verification

- Repository: this run log only. Temporary previews: agentic.config.json, SDLC.md, CODE_REVIEW.md, BACKWARD_COMPATIBILITY.md and the setup specification.
- Commands: git status/remote/branch; file inventories and reads; gh repo view; paginated gh api labels; version checks; the setup reference's cross-skill coverage algorithm using rg.
- Application validation not run yet: configuration installation awaits confirmation; no production source changed. No CI run, test count, coverage or browser result is claimed.

## Final implementation

- Config: `.ai/agentic.config.json`; exact shipped providers: `.ai/trackers/github.md` and `.ai/browsers/agent-browser.md`.
- Project documents: `SDLC.md`, `CODE_REVIEW.md`, `BACKWARD_COMPATIBILITY.md`. Existing `AGENTS.md` and `CLAUDE.md` were preserved.
- Added `.ai/analysis/.gitkeep`, `.ai/scripts/.gitkeep`, `.ai/qa/.gitkeep` and the three approved QA ignore patterns to `.gitignore`. Existing runs/specs placeholders retained.
- Created exactly 25 missing GitHub labels using the installed descriptor's ensure-label-taxonomy operation. Readback confirms every configured label plus do-not-close exists. No existing label was renamed, deleted or recolored.
- Installed jq 1.6 through apt and the official GitHub CLI 2.102.1 in `/usr/local/bin/gh`, preserving `/usr/bin/gh`. Verified the downloaded archive's SHA-256 against the digest returned by the official GitHub release API before executing or installing it. No project dependencies changed.
- Existing agent-browser 0.39.1 and Chrome passed the provider doctor; the only warning was optional ffmpeg for recording, which this setup does not require.
- Saved and completed the approved setup spec, moving it to `.ai/specs/implemented/2026-10-20-agent-pipeline-setup.md`.

## Final verification

Commands ran in configured order. All passed:

| Command | Evidence |
| --- | --- |
| `npm run lint` | ESLint and Prettier passed. |
| `npm run typecheck` | All workspaces passed; Effect diagnostics reported zero errors/warnings. |
| `npm test` | 17 files, 82 tests passed. `test-results/unit/junit.xml`. |
| `NODE_ENV=production npm run build` | Next.js production build passed; public home, backend and health routes compiled. |
| `npm run test:int` | 1 file, 5 tests passed using the task-owned test database. `test-results/int/junit.xml`. |
| `npm run test:e2e` | 1 file, 3 scenarios passed with agent-browser using the task-owned test database. `test-results/e2e/junit.xml`. |

Coverage: statements 100% (192/192), branches 100% (76/76), functions 100% (93/93), lines 100% (179/179). Summary: `coverage/coverage.txt`; HTML: `coverage/index.html`.

Browser evidence: `test-results/e2e/screenshots/01-home-page.png`, `02-backend-dashboard-connected.png`, `03-health-endpoint.png`; server output: `test-results/e2e/server.log`.

Integration and E2E used a new isolated PostgreSQL 17 cluster at `/tmp/devmentor-pipeline-postgres.Ld49ka`, listening only on localhost port 55439, with database `devmentor_pipeline_test`. No shared database writes. The cluster is stopped after verification and retained for recoverability. The Testcontainers path was not exercised locally; no new CI run was created or claimed.

Additional checks: `CONFIG_PROVIDER_DOC_AND_LABEL_CHECKS_OK`, `SKILL_COVERAGE_OK`, QA ignore checks, and `git diff --check`. Existing instructions, package manifests, lockfile and CI workflow have no diff. No production source or tests were changed.

## Commit handoff

The user explicitly authorized `chore: configure agent PR pipeline`. Commit only the setup config, descriptors, generated documents, placeholders, ignore rules, implemented specification and this log. The six validation commands already passed for this implementation; the continuation changes only this run log. No push, PR, merge or repository-settings change is included. Optional product discovery can be added later through `om-setup-discovery-pipeline`.

## User-requested gate and SDLC correction

- The initial setup was committed as `829eccc`. The user then requested removing integration and E2E from the local config gate because CI owns those checks, and removing leaked template instructions from the beginning of SDLC.md.
- Recorded the correction and rendering root cause in `.ai/lessons/2026-10-20-pipeline-gates-and-template-preamble.md` before continuing.
- Scope: update the config and matching SDLC/review/spec descriptions; remove the complete template preamble. Keep integration/E2E CI requirements and existing merge gates. No CI workflow or application code changes are needed.
- Verification plan: reproduce the config/header defects with read-only assertions, apply the minimal edits, verify config/document consistency, then run lint, typecheck, unit coverage and production build. Integration/E2E are left to CI as requested.
- Reproduction: both assertions failed as expected before the edits (local gate contained CI suites; SDLC did not begin at its intended heading). After the fix, assertions passed for the exact four local commands, config/SDLC command agreement, CI suite documentation, clean document heading and absence of leaked authoring markers.
- Updated `.ai/agentic.config.json`, `SDLC.md`, `CODE_REVIEW.md` and the implemented setup spec. Recorded the lesson and updated its index. No production source, test implementation, CI workflow or agent instruction file changed.
- Validation passed: `npm run lint`, `npm run typecheck`, `npm test` (17 files, 82 tests) and `NODE_ENV=production npm run build`. Unit evidence: `test-results/unit/junit.xml`; coverage: `coverage/coverage.txt`, 100% statements (192/192), branches (76/76), functions (93/93), lines (179/179).
- Integration and E2E were not rerun for this correction, per the user's CI-only request. No new CI result is claimed. Changes are uncommitted.

## New PR handoff

- The user requested committing and opening a new PR for the setup and gate correction.
- The old branch name is already used by merged PRs and its remote ref has advanced. Use a fresh branch to avoid rewriting that remote history.
- The current `main` does not contain the local setup commit, so the PR must include both the setup and its follow-up correction. The correction's configured local gate, lint, typecheck, unit coverage and production build were already verified above; no application code changed.
