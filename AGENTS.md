<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor — architecture and standards (mandatory)

**DevMentor** is an npm-workspaces monorepo. The stack, layout and patterns below are approved project decisions. Rationale and examples: `.ai/specs/implemented/2026-10-19-monorepo-architecture.md` (layout) and `.ai/specs/implemented/2026-10-19-engineering-standards.md` (Effect, Zod, modules, errors, tests). Read the standards spec before writing backend code.

## Stack

| Concern | Use | Don't use |
| --- | --- | --- |
| Framework | Latest **Next.js** (App Router, Turbopack) + **React** + **TypeScript** (`strict`) | Pages Router, plain JS files |
| Backend programming model | **Effect 4** (`effect`, all `effect`/`@effect/*` pinned to one version) | Effect 3 APIs, `effect/sql`, `effect/http-api` |
| Validation | **Zod 4** at every boundary | Effect Schema, hand-written parsing |
| Database | **PostgreSQL** via **MikroORM** (`@mikro-orm/postgresql`, migrations via `@mikro-orm/migrations`) | Prisma, Drizzle, TypeORM, raw `pg` pools |
| Dependency injection | **Effect Layers** for services; **Awilix** (via `@devmentor/core/di`) only for infrastructure: the ORM and the per-request `em` fork | ad-hoc singletons, other DI libraries |
| Frontend (public) pages | **Tailwind CSS** v4 utilities | CSS-in-JS, other CSS frameworks |
| Backend (admin) pages | **shadcn/ui** components from `@devmentor/ui` | other component kits |
| Tests | **Vitest** + `@effect/vitest`; e2e with the **agent-browser** CLI | Jest, Playwright, Puppeteer, Cypress |
| Formatting / lint | **Prettier** + ESLint (both in `npm run lint`) | |
| Package manager | **npm** workspaces (keep `package-lock.json` committed) | pnpm/yarn/bun |

Node.js >= 22.17 (required by MikroORM 7).

## Packages

| Package | Responsibility |
| --- | --- |
| `packages/app` (`@devmentor/app`) | Next.js routes/pages; `src/server/` (runtime, `runRequest`, `effectRoute`, `effectAction`); `src/modules/<module>/` (schemas, services, actions); `src/di/container.ts` (Awilix: ORM + `em`) |
| `packages/core` (`@devmentor/core`) | Framework-agnostic: error taxonomy (`/errors`), `decode`/`encode` (`/validation`), Zod primitives (`/schemas`, client-safe), `errorToResponse` (`/http`), Zod env config (`/config`), Awilix helpers (`/di`). No React, Next or ORM |
| `packages/db` (`@devmentor/db`) | MikroORM config, entities, migrations, `getOrm`, `registerDb`, `Db` service, `dbTry`, `withTransaction`, `baseProperties`; module entities/repositories in `src/modules/<module>/` |
| `packages/ui` (`@devmentor/ui`) | shadcn/ui primitives (`src/components`), public-site components (`src/frontend`), `cn`, theme CSS. No Effect, no Zod |

Dependency direction: `app → ui, db, core` and `db → core`. `core` and `ui` import no internal package. Internal packages ship TypeScript source (`exports` → `src`, no build); import them by name and list every importable path in `exports`. Third-party deps go in the package that uses them (`npm i <pkg> -w @devmentor/<name>`); shared tooling goes in the root `package.json`. ESLint enforces the boundaries.

## Always

- Put new code in the lowest package where it fits. A feature is a module: `packages/app/src/modules/<module>/` (`schemas.ts`, `errors.ts`, `<name>-service.ts`, `actions.ts`, `__tests__/`) plus entities in `packages/db/src/modules/<module>/`. Modules import each other only through `schemas`, `errors` and service tags.
- Write services as `Context.Service` classes with key `"<module>/<Name>"` and a static `layer`; add the layer to `AppLayer` in `packages/app/src/server/runtime.ts`. Wrap every method in `Effect.fn("<Service>.<method>")`. Declare request context (`Db`, `RequestContext`) in the method's `R` channel; never capture it in the layer.
- Run effects from edge code only through `runRequest` / `effectRoute` / `effectAction`. Call Next's `redirect()` / `notFound()` after `runRequest` returns. Read `headers()` / `cookies()` at the edge.
- Decode every external input with Zod (`decode`, or the edge adapters) and encode every API/action output through a response schema. Schemas live in the module's isomorphic `schemas.ts`; derive types with `z.infer`. Take actor/tenant ids from the request context, never from input.
- Put expected failures in the error channel as tagged errors from `@devmentor/core/errors` (`ValidationError`, `Unauthorized`, `Forbidden`, `NotFound`, `Conflict`, `BusinessRuleViolation`, `DbError`). `throw` only for defects. Server actions return `ActionResult`.
- Access the database through `Db` + `dbTry((em) => ...)`. Put transaction boundaries (`withTransaction`) in use cases, never in repositories. Define entities with `defineEntity` + `setClass`, spread `baseProperties()` (UUIDv7 `id`, `createdAt`, `updatedAt`) and add each to `entities/index.ts`. Cross-module references are FK id columns without ORM relations.
- Start server-only modules with `import "server-only"`. Effect never runs in client components or `@devmentor/ui`.
- Log through `Effect.log*` (no `console` in server code). Read env only through `parseEnv` / `createOrmConfig`.
- Implement in minimal vertical slices with a test-first (TDD) loop; see [Planning and executing implementation tasks](#planning-and-executing-implementation-tasks).
- Write tests: unit/service tests in `__tests__/*.test.ts(x)` (fakes via `Layer.succeed`, `vi.mock` for infrastructure), DB tests in `__tests__/*.int.test.ts`, e2e in `packages/app/e2e/*.e2e.test.ts`. Every bug fix gets a test that fails without it.
- Cover **100%** of every new feature with unit tests: lines, branches, functions and statements of all code in `packages/*/src` (schemas, services, actions, routes, pages, components). `npm test` enforces the threshold and fails below it; CI runs the same command. Generated migrations are the only exclusion (they run in `test:int` / `test:e2e`). Don't lower the thresholds, widen `coverage.exclude` or add `/* v8 ignore */` comments to get green; write the missing test or delete the dead code.
- Follow the style: kebab-case files, named exports (except Next-required defaults), `import type` for types, no `any`, no `enum`, no non-null `!` outside tests. Branches `feat/` `fix/` `chore/` `docs/`, Conventional Commits.
- Pages that read the database render at request time (`await connection()` first).
- Before declaring work done: `npm run lint`, `npm run typecheck`, `npm test` (100% coverage) and `npm run build` pass. For UI changes, check the page with agent-browser. Run `npm run test:int` / `test:e2e` when touching the DB layer or user journeys.
- Before merging a pull request, wait until **every CI check has finished and is green for the PR's latest commit**: run `gh pr checks <number> --watch`, then confirm the checks belong to the current head SHA (`gh pr view <number> --json headRefOid,statusCheckRollup`). A check that is pending, skipped, cancelled or failed, or a green run of an older commit, blocks the merge. Fix the cause and push again; never merge on red or "probably fine".

## Ask first

- Changing the stack, the package layout or a rule in this file (needs a spec).
- Adding a dependency, package, layer or pattern without a concrete need (see lesson `keep-solutions-simple`). "When needed" patterns in the standards spec (events, optimistic locking, soft delete, OpenAPI, forms library) wait for a real use case.
- Writing to any database you didn't create. Check `echo $DATABASE_URL` first.

## Never

- Use Effect 3 APIs (`Context.Tag`, `Effect.Service`, `catchAll`, `Either`); most online examples are v3, so check `node_modules/effect/AGENTS.md`.
- Call `Effect.runPromise` inside services, repositories or use cases, or write `async` functions there.
- Use the global `orm.em` in request code, initialize the ORM at import time, or change the schema without a migration (`npm run db:migration:create`, review, commit; never edit an applied migration; never `schema:update` on shared databases).
- Return entities or class instances to the client.
- Use `new URL("./relative", import.meta.url)` in code Turbopack bundles (keep file-system paths in CLI-only modules such as `mikro-orm.config.ts`).
- Point `TEST_DATABASE_URL` at a shared or dev database.
- Merge a pull request whose CI checks are not all finished and green for its latest commit, or bypass CI (admin merge, disabling a job or a check).
- Weaken, delete, skip (`.skip`/`.only`/`.todo`) or rewrite a test so that a broken implementation passes. Don't loosen assertions, swap in fakes that hide the behavior under test, or catch the failure inside the test. Change a test only when the requirement itself changed, and say so in the run log.

## Task router

| Task | Where to look |
| --- | --- |
| New feature/module | standards spec §5–§9, `packages/app/src/modules/health/` (reference) |
| Route handler / server action | `packages/app/src/server/effect-route.ts`, `effect-action.ts`, `app/api/health/route.ts` |
| Entity, repository, migration | `packages/db/src/entities/`, `packages/db/src/effect.ts`, `npm run db:migration:*` (MikroORM CLI config `packages/db/src/mikro-orm.config.ts`; runtime driver packages listed in `serverExternalPackages` in `packages/app/next.config.ts`) |
| Errors and HTTP mapping | `packages/core/src/errors.ts`, `http.ts` |
| Env/config | `packages/core/src/config/env.ts`, `packages/app/.env.example` |
| Public page | `packages/app/src/app/(frontend)/` (Tailwind; layout imports `frontend.css`; shared components in `packages/ui/src/frontend/`) |
| Admin page | `packages/app/src/app/(backend)/backend/` (shadcn/ui; add components with `cd packages/ui && npx shadcn@latest add <name>`, import `@devmentor/ui/components/<name>`). `(frontend)` and `(backend)` are separate root layouts: link between them with `<a>`, not `<Link>` |
| Tests | `vitest.config.mts` (projects, coverage thresholds), `packages/*/src/**/__tests__/`, `packages/app/e2e/`, test DB setup `packages/db/src/__tests__/test-database.ts` |
| CI | `.github/workflows/ci.yml` (jobs `lint`, `typecheck`, `unit`, `build`, `integration`, `e2e`); spec `.ai/specs/implemented/2026-10-19-ci-pipeline.md` |

## Commands

- `npm run dev | build | start`, `npm run lint` (ESLint + Prettier check), `npm run format`, `npm run typecheck` (tsc + Effect diagnostics), `npm test` (unit + service, with the 100% coverage gate; HTML report in `coverage/`), `npm run test:int` and `npm run test:e2e` (both get an ephemeral, migrated PostgreSQL: `TEST_DATABASE_URL` if set, otherwise a Testcontainers `postgres:17` container, which needs Docker; e2e also needs `npm run build` and Chrome via `npx agent-browser install --with-deps`, or `E2E_BASE_URL` for a running instance), `npm run db:migration:create | up | down | list`.
- Env files live in `packages/app/` (`.env.local` from `.env.example`); real environment variables override them. Never commit real `.env` files.

# `.ai/` workspace — mandatory conventions

All AI-related project knowledge lives in the `.ai/` directory. Agents MUST follow this structure.

```
.ai/
├── specs/              # Specifications for Spec-Driven Development (SDD)
│   ├── implemented/    # Specs whose implementation is complete
│   └── archive/        # Obsolete, superseded or abandoned specs
├── runs/               # Logs of autonomous AI runs
├── lessons.md          # Index of long-term lessons
└── lessons/            # Detailed lesson write-ups
```

All file names in `specs/`, `runs/` and `lessons/` use the format `YYYY-MM-DD-slug.md` (date = creation date, slug = lowercase kebab-case), e.g. `2026-10-19-user-auth.md`.

## Specs (`.ai/specs/`)

- Before implementing any non-trivial feature or change, check `.ai/specs/` for a relevant spec and follow it. If none exists, write one first (or ask the user) and save it as `.ai/specs/YYYY-MM-DD-slug.md`.
- Do not deviate from a spec silently. If the spec must change, update the spec file in the same change.
- When a spec is fully implemented, move it to `.ai/specs/implemented/` (keep the file name).
- When a spec is obsolete, superseded or abandoned, move it to `.ai/specs/archive/`.
- Never delete specs.

## Runs (`.ai/runs/`)

- Every autonomous run (work done without step-by-step human guidance) MUST be logged in `.ai/runs/YYYY-MM-DD-slug.md`.
- Create the log at the start of the run and update it as work progresses. Include: goal, related spec, steps taken, decisions and their reasons, files changed, commands run, test results, open issues and next steps.
- If a run is resumed on the same day for the same task, append to the existing log instead of creating a new one.

## Lessons (`.ai/lessons.md` and `.ai/lessons/`)

- At the start of every task, read `.ai/lessons.md` and any lessons relevant to the task.
- Record a lesson whenever you: fix a bug (especially a non-obvious one), discover a pitfall or project convention not documented elsewhere, receive a correction from the user, or find an improvement worth remembering.
- Write the full lesson to `.ai/lessons/YYYY-MM-DD-slug.md` (template in `.ai/lessons.md`) and add a one-line entry to the index in `.ai/lessons.md`.
- After a user correction, record the lesson before continuing, phrased as a rule that prevents the same mistake. Don't wait until the task is finished.
- Keep lessons factual and actionable. Fix or remove outdated lessons rather than leaving contradictions.

# Working principles

## Planning and executing implementation tasks

**1. Split the task into minimal vertical slices.**

- A slice is the smallest change that delivers one user-observable scenario end to end, through every layer it needs: Zod schema → service/use case → entity/migration (if any) → route/action → page. Examples: "book a session (happy path)", then "booking fails when the slot is taken", then "list my sessions".
- Don't slice horizontally ("all entities first, then all services, then all UI"). Each slice must be shippable on its own: lint, typecheck, tests and build pass after every slice.
- Order slices so the first one proves the core path (walking skeleton) and later ones add error cases, edge cases and polish. Defer anything no slice needs (keep-it-simple rule).
- Write the slice list in the spec (or in the run log for small tasks). Give each slice its scenarios as acceptance criteria ("given … when … then …") and the test level that proves each one (unit, service, int, e2e).

**2. Implement each slice test-first (TDD), red → green → refactor.**

1. **Red:** write the tests for the slice's scenarios first, covering the happy path and every typed failure the slice introduces (`NotFound`, `Conflict`, `ValidationError`, …). Run them and confirm they fail for the expected reason (missing behavior, not a typo or bad import).
2. **Green:** write the simplest production code that makes them pass. Run the tests after each change and keep working until they are green; don't stop at "should work".
3. **Refactor:** clean up code and tests while they stay green.
4. **Gate:** run `npm run lint`, `npm run typecheck`, `npm test` (plus `test:int` / `test:e2e` when the slice touches the DB or a user journey) and `npm run build`. Then log the slice in the run log and move to the next one.

- Tests must cover every implemented scenario. If code exists that no test exercises, add the missing test or remove the code.
- Choose the lowest test level that proves the scenario: pure functions and schemas get unit tests, services and use cases get service tests with fake layers, repositories and transactions get `*.int.test.ts`, critical journeys get an agent-browser e2e test.
- A failing test means the implementation is wrong until proven otherwise. Fix the code, not the test (see **Never**). If a test really is wrong (a bad assumption about the requirement), stop, explain why in the run log or to the user, and only then change it.
- If a slice gets stuck (tests stay red after a few honest attempts, or the design fights you), stop and re-plan the slice instead of patching around it.

## General

- **Plan complex tasks first.** For multi-file, ambiguous or architectural work, explore and plan before editing. Get user approval and capture the plan, including its vertical slices, in a spec (see Specs). Then implement slice by slice, test-first. If the work goes sideways, stop and re-plan; don't keep patching.
- **Verify every change.** Before declaring work done, run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`. For UI changes, run the app (`npm run dev`) and check the affected page with agent-browser. Report results truthfully: state what failed and what was not verified.
- **Fix bugs end-to-end.** Given a bug report or failing check, find the root cause from logs, errors and code, fix it, and verify the fix without asking for step-by-step guidance. Record a lesson if the cause was non-obvious.
- **Prefer the elegant solution.** If a fix turns out hacky, replace it with the clean solution rather than layering workarounds.
- **Use subagents for breadth.** Delegate wide searches, research and independent subtasks to subagents. This keeps the main context focused. Parallel work on separate tasks should use separate git worktrees.
- **Automate repetition.** If you perform a workflow repeatedly, propose turning it into a committed skill or slash command.
