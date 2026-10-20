# Agent pipeline setup

- Created: 2026-10-20
- Status: implemented and verified
- Source: explicitly invoked `om-setup-agent-pipeline`

## Goal and scope

Configure the installed OM skills for DevMentor using the existing npm workspace architecture, GitHub main branch, agent-browser, four local validation commands, full label taxonomy and QA gate. CI additionally runs integration and E2E tests. Preserve existing agent instructions and application behavior. Add the missing delivery, review and compatibility documents from the approved previews. Install the shipped GitHub and agent-browser descriptors, add QA artifact ignores and retain the required workspace directories.

## Slices and acceptance

1. Given no pipeline config, when setup is confirmed, then consumers can load version 1 configuration and the selected provider descriptors. Verify JSON, command order, file existence and installed cross-skill references. Create only missing labels after confirmation; preserve existing labels exactly.
2. Given the configured pipeline, when an author or reviewer reads the process documents, then repository-specific rules, protected surfaces, QA and latest-head CI gates are explicit. Verify the SDLC begins at its document heading with no template instructions or unresolved placeholders and existing instruction files are unchanged.
3. Given generated setup files, when verification runs, then lint, typecheck, 100% unit coverage and production build pass. Record counts and evidence; integration/E2E run in CI and require disposable database/browser prerequisites. Offer a scoped commit after verification.

## Decisions and exclusions

Use automatic base-branch resolution (currently main), retain `.ai/specs`, and rely on root CODE_REVIEW.md with no extra checklist. Use production mode explicitly for the build to match CI and the documented sandbox pitfall. Per the user's correction, the local gate contains lint, typecheck, unit tests and build; integration and E2E remain required CI checks before merge. Do not change stack, dependencies, CI jobs, branch protection or existing agent instruction files. Do not install optional product discovery configuration as part of delivery setup.

## Verification and prerequisites

Installed jq 1.6 and the official gh 2.102.1 release, verifying the binary archive against the digest published by GitHub before installing it. The distribution gh remains available at /usr/bin/gh. The installed agent-browser 0.39.1 and Chrome pass the provider doctor, so no browser download was needed.

The initial setup passed all six commands: lint, typecheck, 82 unit tests with 100% statements/branches/functions/lines, production build, 5 integration tests and 3 E2E tests. Database tests used a fresh task-owned PostgreSQL cluster; the shared database was not written. E2E screenshots, JUnit files and coverage summaries are recorded in the run log. Cross-skill and configuration/provider/label checks passed. Existing agent instructions and application/CI source were preserved. The user subsequently narrowed the configured local gate to four commands, leaving integration/E2E to CI; verification of that correction is recorded in the same run log.
