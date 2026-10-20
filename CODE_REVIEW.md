# DevMentor code review

Read `AGENTS.md`, the relevant `.ai/specs/` document and lessons before reviewing. The architecture, engineering standards and CI specifications under `.ai/specs/implemented/` remain authoritative. Read installed Next.js guides before assessing changed framework APIs, and installed Effect guidance for version 4 APIs.

## Priorities

Review correctness, security and contract compatibility first. Check the happy path, typed failures, permissions, validation and data isolation. Apply `BACKWARD_COMPATIBILITY.md` to affected consumers and persisted data. Keep implementation within the approved spec and avoid speculative abstractions or dependencies.

## Repository checks

- Respect npm workspace boundaries: app imports ui/db/core; db imports core; core and ui import no internal package. Use package names and declared exports. Put code in the lowest suitable package.
- Services use Effect 4 `Context.Service` classes, static layers and `Effect.fn`. Keep request-scoped `Db` and `RequestContext` in method requirements. Execute effects only through `runRequest`, `effectRoute` or `effectAction` at edges. Expected failures belong in the typed error channel.
- Decode external inputs and encode client outputs with module Zod schemas. Obtain actor and tenant identifiers from request context. Return plain DTOs, never entities. Preserve HTTP error codes, status mappings, action results and internal-error redaction.
- Start server implementations with `import "server-only"`; keep schemas isomorphic. No Effect execution in client components or ui. Log through Effect and read configuration through the approved parsers.
- Use request entity-manager forks via `Db` and `dbTry`; transactions belong in use cases. Entity changes need reviewed forward migrations. Preserve applied migrations and existing data. Database tests use isolated disposable databases; obtain permission before writing to a database the agent did not create.
- Public pages use Tailwind; admin pages use shadcn/ui from the ui workspace. Database pages call `await connection()` first. Cross-root-layout navigation uses anchors between frontend and backend.
- Implement minimal vertical slices test-first. Every bug fix needs a regression test. Require 100% lines, branches, functions and statements for production source, with only generated migrations excluded. Never weaken assertions, skip tests or widen coverage exclusions to obtain a pass.

## Evidence and verdict

Run the ordered local gate in `.ai/agentic.config.json`: lint, typecheck (including Effect diagnostics), unit tests with coverage and the production build. CI runs integration tests and agent-browser E2E; require their passing results for the latest PR head before merge. Cite test counts, JUnit results in `test-results/`, `coverage/coverage.txt`, screenshots and CI artifacts. Every E2E scenario ends with a screenshot of the asserted state. UI changes also require browser verification.

Classify exploitable security issues, data loss, broken required gates and incompatible protected contracts as blockers. Major findings affect expected behavior or mandatory architecture. Minor findings are bounded maintainability issues; style preferences alone are not blockers. Each finding names a location, consequence and concrete acceptance criterion. Request changes for unresolved blockers or majors; otherwise approve with any follow-ups stated.

Review approval does not authorize merging early. Every CI check must finish and pass for the current PR head, with the branch up to date and review threads resolved. Confirm with `gh pr checks <number> --watch` and `gh pr view <number> --json headRefOid,statusCheckRollup`. QA evidence must cover the tested head and satisfy the gate in `SDLC.md`. Never bypass checks or change repository settings without explicit authorization.
