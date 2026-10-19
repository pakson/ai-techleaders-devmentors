# DevMentor: tech stack, engineering standards and design patterns

- Date: 2026-10-19
- Status: **implemented 2026-10-19** (approved the same day: D1–D9 accepted as recommended; D6 changed to agent-browser for e2e). Refinements made during implementation are listed in §16.
- Implementation run: [../../runs/2026-10-19-engineering-standards-implementation.md](../../runs/2026-10-19-engineering-standards-implementation.md)
- Builds on: [2026-10-19-monorepo-architecture.md](2026-10-19-monorepo-architecture.md)
- Research run: [../../runs/2026-10-19-tech-stack-standards-spec.md](../../runs/2026-10-19-tech-stack-standards-spec.md)

## 1. Goal

Set the standards that every DevMentor feature follows: the backend programming model (**Effect**), input/output validation (**Zod**), module structure, data conventions, API contracts, error handling, testing and coding style. The sources are two mature TypeScript + MikroORM + Awilix codebases, **Open Mercato** (v0.9.0) and **Medusa v2** (v2.21), plus the current Effect 4 and Zod 4 releases. We copy what fits a single-product app and drop the platform machinery we don't need.

## 1a. Guiding principle: keep it simple

User requirement: keep the solution simple and don't add complexity that isn't needed or requested.

- Build only what a current feature needs. Patterns marked **"when needed"** below are deferred until a real use case shows up; they are not part of the foundation work.
- Prefer a plain function over an abstraction, and one obvious way over a configurable one. No generic frameworks (CRUD generators, plugin systems, registries).
- A new dependency, package, layer or pattern needs a concrete reason stated in the spec or run log.
- Reuse what the stack already gives us (Effect, Zod, MikroORM, Next) before writing helpers.

## 2. Decisions (approved)

Some of these change rules in AGENTS.md, so they need explicit approval. Each has a recommendation.

| # | Decision | Recommendation | Alternatives |
| --- | --- | --- | --- |
| D1 | Role of Awilix vs Effect Layers (both are DI systems) | **Effect Layers own the backend service graph.** Awilix shrinks to infrastructure bootstrapping (ORM, per-request `em` fork, non-Effect helpers). Revisit after 2–3 modules; if Awilix only holds `orm` + `em` by then, retire it in a follow-up spec | (B) Drop Awilix now and model everything as Layers. (C) Keep Awilix for services and use Effect only inside method bodies (loses typed dependencies and compile-time wiring checks) |
| D2 | Where domain modules live | **No new packages.** The module's application code goes in `packages/app/src/modules/<module>/`; entities and repositories go in `packages/db/src/modules/<module>/` | A new `@devmentor/modules` package (cleaner vertical slices, but changes the package layout) |
| D3 | Effect version | **`effect@^4.0`** (4.0.5, stable LTS since 2026-10-01). Pin all `effect` / `@effect/*` packages to the same version | Effect 3.x (`prev` line, receives no new features) |
| D4 | Effect HTTP (`effect/http-api`) vs Next route handlers | **Next route handlers + server actions** with a small shared Effect adapter. `effect/http-api` and `effect/sql` are marked `@stability unstable` and are built on Effect Schema, not Zod | Mount `HttpApi` in a catch-all route |
| D5 | Validation library split | **Zod 4 at every boundary** (forms, actions, route input/output, env, OpenAPI). **Effect Schema is not used** | Effect Schema for Config/serialized errors |
| D6 | Test stack | **Vitest 5 + `@effect/vitest`** (unit + DB integration), **agent-browser** (e2e, user decision). Integration tests run against a real Postgres | Jest; Playwright (rejected by the user) |
| D7 | Primary keys | **UUIDv7** generated in the app (`uuidv7`), Postgres `uuid` column | Prefixed ULIDs as in Medusa (`usr_01H…`): readable, but stored as text |
| D8 | List/pagination contract | `page`, `pageSize` (default 20, max 100), `sort`, `order`, with response `{ items, total, page, pageSize }` | Medusa-style `limit`/`offset` |
| D9 | Formatter | **Prettier** (double quotes, semicolons, width 100, matching the current code) | ESLint stylistic rules only |

## 3. What we take from the reference projects

| Practice | Source | Adopt? | Notes |
| --- | --- | --- | --- |
| Module = folder with conventional files (`schemas`, `errors`, `service`, `acl`, `events`, tests) | OM, Medusa | **Yes** | No code generation, no auto-discovery; modules are wired by hand in the composition root |
| No ORM relations across modules; plain FK ids + explicit link tables | OM `extensions.ts`, Medusa `defineLink` | **Yes** | Enforced by a lint rule on cross-module imports |
| Layering: edge (route/action) → use case (orchestration, transaction) → service/repository | Medusa (route → workflow → module service) | **Yes** | Use cases are plain `Effect.gen` functions, not a workflow DSL |
| Closed error taxonomy + one HTTP mapper hiding 5xx messages | Medusa `MedusaError` + `error-handler.ts`, OM `CrudHttpError` | **Yes** | Done with Effect tagged errors |
| Zod validators next to the module, types via `z.infer`, OpenAPI from the same schemas | OM `data/validators.ts`, Medusa `validators.ts` | **Yes** | |
| Server-injected scope (user/org ids never trusted from the body) | OM `withScopedPayload` | **Yes** | |
| Standard columns (`created_at`, `updated_at`, `deleted_at`), partial indexes `where deleted_at is null` | both | **Yes** | |
| Optimistic locking via a version column → 409 | OM | **When needed** | Opt-in per entity |
| Feature-based ACL ids `<module>.<action>`, never checking role names | OM `acl.ts` | **Yes** (with the auth spec) | Auth itself gets its own spec |
| Events released only after commit; one side effect per subscriber | both | **When needed** | The rule applies once the first event exists |
| Architecture rules encoded as lint rules | Medusa (~75 custom rules), OM DS plugin | **Yes, minimal** | Built-in `no-restricted-imports` only; custom rules only when a mistake repeats |
| Real-DB integration test runner per module | Medusa `moduleIntegrationTestRunner` | **Yes** | |
| Generated CRUD services / 3 000-line CRUD route factory | Medusa `MedusaService`, OM `makeCrudRoute` | **No** | Too much magic for one app. Small typed helpers instead (`decode`, `paginate`, `effectRoute`) |
| Decorator context threading (`@InjectManager`, `@MedusaContext`) | Medusa | **No** | Effect's `R` channel carries the request context (see 6.3) |
| `createWorkflow` DSL with compensation | Medusa | **No** (for now) | Plain Effect + `Effect.onError` for compensation. Revisit `effect/workflow` if durable workflows are needed |
| In-memory cross-module query joiner / EAV query index | Medusa Query, OM QueryEngine | **No** | One database, so MikroORM queries and SQL views are enough |
| Command bus with undo/redo + audit snapshots | OM | **Later** | An audit log may come with its own spec |
| Codegen registries + catch-all routes | OM | **No** | Native App Router files |
| Built `dist` packages, Turbo, Yarn | both | **No** | Keep npm workspaces + source-only packages |
| Agent rules split into Always / Ask first / Never, size budget | OM `AGENTS.md` | **Yes** | Applied when AGENTS.md is updated |

## 4. Tech stack (target)

The current stack (Next.js 16, React 19, TS 5.9 strict, PostgreSQL, MikroORM 7, Tailwind 4, shadcn/ui, npm workspaces) stays. Additions:

| Concern | Choice | Package(s) | Where |
| --- | --- | --- | --- |
| Backend programming model | Effect 4 | `effect` | core, db, app (server only) |
| Validation | Zod 4 | `zod` | core, app |
| OpenAPI (when needed) | `zod-openapi` 6 (from Zod schemas) | `zod-openapi` | app, only once an external API consumer exists |
| Forms (when needed) | react-hook-form + Zod resolver | `react-hook-form`, `@hookform/resolvers` | app (client), added with the first non-trivial form |
| IDs | UUIDv7 | `uuidv7` | db |
| Unit/integration tests | Vitest 5, `@effect/vitest` | root devDeps | all packages |
| E2E tests | agent-browser (CLI, driven from Vitest) | root devDeps | app |
| Effect tooling | `@effect/language-service` (tsconfig plugin) | root devDeps | all |
| Formatting | Prettier 3 | root devDeps | all |

Not adopted: OpenTelemetry (until an ops spec), `effect/sql` / `@effect/sql-pg` (a parallel DB client next to MikroORM), Effect Schema, BullMQ/Redis (until a job queue spec exists).

## 5. Architecture

### 5.1 Packages (unchanged boundaries)

| Package | New responsibility |
| --- | --- |
| `@devmentor/core` | Effect + Zod foundations, framework-agnostic: the error taxonomy (`errors/`), `decode` (Zod → Effect), shared Zod primitives (`schemas/`: ids, pagination, list response), `errorToResponse` (Web `Response`, no Next), env parsing with Zod |
| `@devmentor/db` | `Db` (the `EntityManager` as an Effect service), `dbTry`/`mapDbError`, `withTransaction`, entities and repositories per module (`src/modules/<module>/`), base entity properties |
| `@devmentor/app` | `src/server/`: `ManagedRuntime` singleton, `runRequest`, `effectRoute`, `effectAction`, request context. `src/modules/<module>/`: schemas, services, use cases, actions, ACL, events. Routes and pages stay thin |
| `@devmentor/ui` | unchanged (no Effect, no Zod) |

Effect never runs in client components or in `@devmentor/ui`. Server-only modules start with `import "server-only"`.

### 5.2 Module layout (D2)

```
packages/db/src/modules/mentoring/
├── entities/session.ts          defineEntity + setClass; added to entities/index.ts
├── session-repository.ts        (when needed) Context.Service: data access only; simple modules query Db directly from the service
└── __tests__/session-repository.int.test.ts

packages/app/src/modules/mentoring/
├── schemas.ts                   Zod I/O schemas + z.infer types (isomorphic, safe for the client)
├── errors.ts                    module-specific tagged errors (if any)
├── acl.ts                       feature ids: "mentoring.sessions.view", "mentoring.sessions.manage"
├── events.ts                    (when needed) typed event definitions: "mentoring.session.booked"
├── session-service.ts           Context.Service: domain rules, uses repositories
├── use-cases/book-session.ts    (when needed) orchestration across services; simple flows live in the service
├── actions.ts                   "use server" actions → effectAction(...)
├── layer.ts                     MentoringLive = Layer.mergeAll(...) for the composition root
└── __tests__/…
```

Routes (`app/api/.../route.ts`) and pages import from the module. Modules import each other only through their `schemas.ts` and their service tags, never through entities or repositories. A built-in `no-restricted-imports` rule enforces this.

### 5.3 Request flow

```
route.ts / actions.ts / page.tsx         (edge: read headers/cookies, call effectRoute/effectAction/runRequest)
  └─ decode input (Zod) ─────────────────> ValidationError
  └─ use case (Effect.gen)               (authorization, orchestration, withTransaction, publish events)
       └─ service (Context.Service)      (domain rules, typed errors)
            └─ repository (Context.Service) → Db (EntityManager fork)
  └─ encode output (Zod response schema)
  └─ Exit → Response | ActionResult      (single error mapper)
```

## 6. Backend patterns (Effect)

### 6.1 Runtime

- One `ManagedRuntime` per process, created lazily and cached on `globalThis` (HMR-safe, same as `getOrm()`). It holds process-lifetime layers: Logger, config, the ORM, all module service/repository layers. `next build` must not touch the database, so nothing is built at import time.
- `runRequest(program, { signal })` is the only way edge code runs an effect. It forks an `em` per unit of work, provides the request context (`Db`, `RequestContext` with request id, current user once auth exists), wires `req.signal` to interruption and returns an `Exit`.
- Never call `Effect.runPromise` inside services, repositories or use cases.

### 6.2 Services and layers

```ts
// packages/app/src/modules/mentoring/session-service.ts
export class SessionService extends Context.Service<SessionService, {
  readonly get: (id: SessionId) => Effect.Effect<Session, NotFound | DbError, Db>
  readonly book: (input: BookSessionInput) => Effect.Effect<Session, Conflict | DbError, Db>
}>()("mentoring/SessionService") {
  static readonly layer = Layer.effect(SessionService, Effect.gen(function* () {
    const sessions = yield* SessionRepository
    return {
      get: Effect.fn("SessionService.get")(function* (id) {
        const session = yield* sessions.findById(id)
        if (!session) return yield* new NotFound({ resource: "session", id })
        return session
      }),
      book: Effect.fn("SessionService.book")(function* (input) { /* … */ }),
    }
  }))
}
```

Rules:
- Service tags use the `"<module>/<Name>"` key. The live layer is a static `layer` on the class. Test fakes are built with `Layer.succeed(Tag, fake)`.
- **Services are built once (process lifetime).** Request-scoped context (`Db`, `RequestContext`) is **not** captured at construction; methods declare it in the `R` channel. This replaces Medusa's `sharedContext` parameter and decorators, avoids rebuilding layers per request, and makes transactions a matter of re-providing `Db`.
- Every public method is wrapped in `Effect.fn("<Service>.<method>")` so it gets a tracing span and a readable stack.
- Pure domain logic (calculations, state transitions) is written as plain functions, without Effect, and tested without layers.

### 6.3 Database access

- `Db` is a `Context.Service` whose value is the forked `EntityManager`. Repositories call MikroORM through `dbTry((em) => em.find(...))` (the helper reads `Db` itself), which maps exceptions: `UniqueConstraintViolationException` → `Conflict`, `NotFoundError` → `NotFound`, optimistic-lock errors → `Conflict`, anything else → `DbError` (cause kept, message hidden from clients).
- `withTransaction(effect)`: forks a transactional `em`, provides it as `Db` to `effect`, commits on success, rolls back on any failure/defect/interruption (`Effect.acquireUseRelease` around `begin`/`commit`/`rollback`). Nested calls join the outer transaction. The transaction boundary is in the **use case**, never in repositories.
- Lessons carried over: never `find` between a mutation and `flush` inside multi-step writes without a transaction (OM's lost-update pitfall); never use the global `orm.em`.
- **When needed:** domain events are published only **after commit**, each subscriber does one side effect and must be idempotent. The mechanism (in-process `PubSub` vs a queue) is chosen in the spec of the first feature that needs events.

### 6.4 Errors

Closed taxonomy in `@devmentor/core/errors` (`Data.TaggedError`). Module-specific errors extend it only when callers need to branch on them.

| Tag | HTTP | Meaning |
| --- | --- | --- |
| `ValidationError` | 400 | Zod decode failure; `issues` from `z.flattenError` |
| `Unauthorized` | 401 | not signed in |
| `Forbidden` | 403 | missing ACL feature |
| `NotFound` | 404 | `{ resource, id }` |
| `Conflict` | 409 | unique violation, optimistic lock, invalid state transition |
| `BusinessRuleViolation` | 422 | domain rule rejected the request (`code` is a stable string) |
| `DbError`, defects | 500 | logged with `Cause.pretty`, generic message to the client |

- Error body: `{ "error": { "code": "not_found", "message": "…", "details"?: … } }`.
- Server actions return `{ ok: true, data } | { ok: false, error: { code, message, fieldErrors? } }`; class instances never cross the wire.
- Expected failures go in the `E` channel; `throw` is only for defects. `Effect.orDie` is allowed only where a failure really is a bug.
- `redirect()` / `notFound()` from Next are called **outside** the effect, after `runRequest` returns. Inside an effect Next's thrown signals would be caught as defects.

### 6.5 Edge adapters

```ts
// packages/app/src/app/api/sessions/[id]/route.ts
export const GET = effectRoute(
  { params: z.object({ id: SessionId }), response: SessionDto },
  ({ params }) => SessionService.use((s) => s.get(params.id)).pipe(Effect.map(toSessionDto)),
)
```

- `effectRoute({ params?, query?, body?, response }, handler)`: decodes inputs with Zod, runs the handler through `runRequest`, **encodes the output through the response schema** (strips unknown fields, so nothing leaks), maps `Exit` to a `Response`.
- `effectRoute` also takes an optional success `status` (default 200, 201 for creates).
- `effectAction({ input, output }, handler)` does the same for server actions and returns an `ActionResult`.
- Server components call `await connection()` then `runRequest(...)`.
- `headers()` / `cookies()` are read at the edge and passed into the request context. Effect code never calls Next request APIs.

### 6.6 Config

- Env is parsed with a Zod schema by `parseEnv()` in `@devmentor/core/config` (`DATABASE_URL`, pool settings, …) and used by `createOrmConfig`. Secrets are wrapped in `Redacted`. A misconfigured env fails on first ORM use with `ConfigError` listing every invalid variable.
- **When needed:** an Effect `AppConfig` service, added once Effect code needs config values.

### 6.7 Concurrency, retries, observability

- Use `Effect.forEach(..., { concurrency: n })` with a bounded `n` (keep within `DB_POOL_MAX`), `Effect.timeout` on outbound I/O, and `Effect.retry` with an explicit `Schedule` only for transient errors.
- Logging only through `Effect.log*` with annotations (request id), no `console.*` in server code. Spans come for free through `Effect.fn`; exporting them is out of scope until needed.

## 7. Validation (Zod)

- Every external input is decoded: route params/query/body, server action input, env, webhook payloads, JSON columns read from the DB. Every API/action output is encoded through a response schema.
- Schemas live in the module's `schemas.ts` (isomorphic: no server imports) and are reused by forms (`zodResolver`), actions, routes and OpenAPI. Types come from `z.infer` / `z.input`; DTO interfaces aren't written twice.
- Naming: `CreateSessionInput` (schema) / `type CreateSessionInput = z.infer<typeof CreateSessionInput>`; response DTOs end in `Dto`.
- Objects default to `z.object` (strips unknown keys); `z.strictObject` for config and webhook-signature payloads.
- Shared primitives in `@devmentor/core/schemas`: `Uuid`, branded ids (`SessionId = Uuid.brand<"SessionId">()`), `PaginationQuery`, `listResponse(item)`, `IsoDateTime`.
- Ids that identify the actor or tenant (user, org) are taken from the request context, never from the input schema.

## 8. Data conventions (MikroORM)

- Entities: `defineEntity` + `setClass` (unchanged). Tables are snake_case plural, prefixed with the module when the name is ambiguous (`mentoring_sessions`).
- Base properties shared via a helper: `id` (UUIDv7, D7), `createdAt`, `updatedAt` (`onUpdate`). `deletedAt` (soft delete) and `version` (optimistic locking) are added only to entities that need them.
- For soft-deletable entities, deleted rows are excluded by a MikroORM filter. Unique indexes on soft-deletable tables are partial (`where deleted_at is null`).
- Cross-module references are FK id columns without an ORM relation. Many-to-many across modules uses an explicit link entity owned by the "consumer" module.
- Repositories return entities internally. Services and use cases map to DTOs at the edge via the response schema. Entities never reach the client.
- Migrations: unchanged rules (generated, reviewed, committed, never edited after apply).
- Timestamps as `timestamptz`; enums as text with a check constraint (via MikroORM `enum`).

## 9. API conventions

- REST-ish JSON under `/api/<module>/<resource>`; internal UI mutations prefer **server actions**. Route handlers exist for external consumers, webhooks and client-side fetching.
- Lists: query `page`, `pageSize` (≤ 100), `sort`, `order`, `q`; response `{ items, total, page, pageSize }` (D8).
- Single resource: the DTO itself. Create → 201 with the DTO. Delete → 204.
- Request/response field names are camelCase. The DB uses snake_case, handled by MikroORM naming.
- An OpenAPI document is generated from the route schemas once the first externally consumed API exists.

## 10. Coding standards

**TypeScript**
- `strict` + `noUncheckedIndexedAccess` (already on). No `any` (use `unknown` + decode). No non-null `!` except in tests. No `enum` keyword; use string-literal unions or `as const` objects.
- Named exports only, except where Next.js requires default exports (pages, layouts).
- `import type` for type-only imports (`verbatimModuleSyntax` is on).

**Naming and files**
- Files and folders are kebab-case (`session-service.ts`); React components are PascalCase symbols in kebab-case files. Entity files keep the current PascalCase name (`User.ts`) until a rename is agreed.
- Types/classes PascalCase, functions/variables camelCase, constants `SCREAMING_SNAKE` only for true constants.
- Event ids `<module>.<entity>.<pastTenseVerb>`, ACL features `<module>.<resource>.<action>`, service keys `"<module>/<Name>"`.

**Effect style**
- `Effect.gen` + `yield*` for sequential logic, `pipe` for short transforms. `Effect.fn("Name")` for every service method and use case.
- No `async` functions in service/repository/use-case code. Promises are wrapped once at the boundary (`dbTry`, `Effect.tryPromise`).
- No v3 APIs (`Context.Tag`, `Effect.Service`, `catchAll`, `Either`). Most online examples and model training data are v3, so check against v4 docs.
- `@effect/language-service` diagnostics (floating effects, missing `yield*`) are treated as errors.

**React / UI**
- Server components by default; `"use client"` only for interactivity. Data loading happens in server components/actions through `runRequest`.
- Forms use react-hook-form + the module's Zod schema and render `fieldErrors` from `ActionResult`.
- The existing Tailwind/shadcn split stays as it is.

**Comments**: explain *why*, not *what*. JSDoc on exported functions of `core`/`db`.

**Formatting / lint**: Prettier (D9) + ESLint (Next configs + `no-restricted-imports` for module boundaries + `@typescript-eslint/no-floating-promises`). Both run in `npm run lint`.

## 11. Testing standards

| Level | Tool | Scope | Location |
| --- | --- | --- | --- |
| Unit | Vitest | pure functions, Zod schemas, error mapping | `__tests__/*.test.ts` next to code |
| Service | `@effect/vitest` (`it.effect`, `layer(...)`) | services/use cases with fake repositories via `Layer.succeed` | `__tests__/*.test.ts` |
| DB integration | `@effect/vitest` + real Postgres | repositories, `withTransaction`, migrations apply cleanly | `__tests__/*.int.test.ts`; separate test database, schema from migrations, each test runs in a rolled-back transaction |
| E2E | agent-browser | critical user journeys through the browser | `packages/app/e2e/*.e2e.test.ts` |

- E2E tests are Vitest files that drive the `agent-browser` CLI through a small helper (`execFile` with `--json`, a dedicated `--session e2e`). Each step runs a command (`open`, `snapshot -i`, `fill`, `click`, `wait --text`, `get text`) and the test asserts on the JSON result. The app under test runs via `npm run start` against the test database. No extra test framework.
- Agents also use agent-browser interactively to check UI changes (the "run the app and check the affected page" rule).
- Every bug fix comes with a test that fails without it. Every use case has a service test covering its typed failures.
- Scripts: `npm test` (unit + service), `npm run test:int` (needs `TEST_DATABASE_URL`, never the shared sandbox DB; see lesson `sandbox-database-url-overrides-env-files`), `npm run test:e2e` (agent-browser; Chrome installed with `npx agent-browser install`).
- Definition of done adds `npm test` to the existing lint/typecheck/build gate.

## 12. Process

- Git: branches `feat/`, `fix/`, `chore/`, `docs/`; Conventional Commits (`feat(mentoring): book session`); one logical change per commit.
- Specs/runs/lessons: unchanged `.ai/` conventions. Each new module starts with a spec listing its schemas, errors, ACL features, events and tests.
- Implementation (added 2026-10-19, user requirement): split every task into minimal vertical slices (one end-to-end scenario each, shippable on its own) and implement each slice test-first (red → green → refactor), working until tests are green. Tests are never weakened or rewritten to make an implementation pass. Details in AGENTS.md, "Planning and executing implementation tasks".
- AGENTS.md gets reorganized (OM style): **Always / Ask first / Never** sections plus a short task router, with the size kept small.

## 13. Implementation plan (after approval)

1. Update AGENTS.md, README and the stack table (Effect, Zod, the Awilix role from D1, testing, coding standards). Record the decisions.
2. Tooling: Prettier, Vitest + `@effect/vitest` config, `@effect/language-service`, `no-restricted-imports` boundaries, agent-browser + one e2e smoke test (home page, `/backend`), `npm test` scripts.
3. `@devmentor/core`: error taxonomy, `decode`, shared schemas, `errorToResponse`, Zod env config (replacing the ad-hoc readers).
4. `@devmentor/db`: `Db` service, `dbTry`, `withTransaction`, base entity properties (UUIDv7, timestamps), migration for existing `User` if ids change.
5. `@devmentor/app`: `ManagedRuntime`, `runRequest`, `effectRoute`, `effectAction`. Port `/api/health` and `HealthService` to the new pattern as the reference example.
6. Tests for all of the above, including a DB integration test for `withTransaction` rollback.
7. Verify lint, typecheck, test, build; move this spec to `implemented/`.

## 14. Open questions

- Auth provider and session model (needed for `RequestContext.user` and ACL): separate spec.
- Multi-tenancy (organizations): DevMentor's product scope decides this. If needed, add `organization_id` to base properties from the start, because adding it later is expensive.
- Background jobs/queue (pg-boss on Postgres vs BullMQ/Redis): separate spec when the first async job appears.
- CI pipeline (GitHub Actions running the definition-of-done gate + a Postgres service): separate spec.

## 15. Out of scope

Implementing any of the above (this spec only sets the standards), the domain model, authentication, deployment.

## 16. Implementation notes (2026-10-19)

Refinements made while implementing; the sections above are updated to match.

- **Packages/exports:** `@devmentor/core` exposes subpaths `/errors`, `/validation` (`decode`, `encode`), `/schemas` (client-safe), `/http` (`toApiError`, `mapCause`, `errorToResponse`), `/config` (`parseEnv`), `/di`. The old `AppError` base class and ad-hoc env readers (`requireEnv`, `readEnv*`) are replaced by the tagged taxonomy and `parseEnv`.
- **Output encoding** uses Zod 4 codecs (`z.safeEncode`); `IsoDateTime` is a codec (ISO string on the wire, `Date` in code). An output that doesn't match its schema is a defect (500).
- **Health reference:** `HealthService.check()` fails with `DbError` when the database is down, so `/api/health` now answers 500 with the generic body (it used to answer 503 with the raw error message, which leaked driver details). The dashboard page shows "Unavailable" and points to the server log.
- **`AppConfig` Effect service** and the **`paginate` helper** are deferred until a consumer exists (keep-it-simple rule).
- **Awilix (D1):** `AppCradle` holds only `orm` + `em`; `HealthService` moved to an Effect layer in `packages/app/src/modules/health/`.
- **`User`** now spreads `baseProperties()`; only the id generator changed (v4 → v7, same `uuid` column), so no migration was needed (`migration:check` reports no changes).
- **`@effect/language-service`** is enabled as a tsconfig plugin (editor) and run as `effect-language-service diagnostics --strict` in every Effect package's `typecheck` script (fails the gate), instead of patching `tsc`.
- **Lint:** module/package boundaries use `no-restricted-imports` per package plus `import/no-relative-packages` (already shipped with the Next ESLint config); `no-floating-promises`, `no-explicit-any`, no `enum`, and `no-console` in server code. Prettier skips Markdown, migrations and shadcn-managed files.
- **Integration tests:** a global setup applies migrations to `TEST_DATABASE_URL` and refuses to run if it equals `DATABASE_URL`. The `withTransaction` tests need real commits, so they clean up their own rows instead of running inside a rolled-back transaction. A rollback-per-test helper arrives with the first repository tests.
- **E2E:** `packages/app/e2e/agent-browser.ts` drives the CLI (`--session e2e --json`); the e2e global setup migrates the test DB and starts `next start` on port 3100 in its own process group (unless `E2E_BASE_URL` is set). On Linux, Chrome needs `npx agent-browser install --with-deps`.
