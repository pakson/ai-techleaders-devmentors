# DevMentor

DevMentor is a Next.js application in an npm-workspaces monorepo.

| Concern | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Database | PostgreSQL |
| ORM | [MikroORM](https://mikro-orm.io) 7: entities, migrations, connection pooling |
| Backend programming model | [Effect](https://effect.website) 4: services as Layers, typed errors |
| Validation | [Zod](https://zod.dev) 4 at every boundary (input, output, env) |
| Dependency injection | Effect Layers for services; [Awilix](https://github.com/jeffijoe/awilix) for infrastructure (ORM, per-request `EntityManager`) |
| Public pages | [Tailwind CSS](https://tailwindcss.com) 4 |
| Admin (backend) pages | [shadcn/ui](https://ui.shadcn.com) |
| Tests | [Vitest](https://vitest.dev) + `@effect/vitest`, e2e with [agent-browser](https://github.com/vercel-labs/agent-browser) |
| Formatting | Prettier + ESLint |

## Getting started

Requirements: Node.js >= 22.17, npm, PostgreSQL (or Docker).

```bash
npm install

# 1. Start PostgreSQL (or point DATABASE_URL at your own server)
docker compose up -d

# 2. Configure the environment
cp packages/app/.env.example packages/app/.env.local

# 3. Create the schema
npm run db:migration:up

# 4. Run the app
npm run dev
```

- http://localhost:3000: public site
- http://localhost:3000/backend: admin area
- http://localhost:3000/api/health: health check (reference `effectRoute` + Effect service; pings the database)

## Scripts (run from the repo root)

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server (forwarded to `@devmentor/app`) |
| `npm run lint` / `format` | ESLint + Prettier check across the repo / apply Prettier |
| `npm run typecheck` | `tsc --noEmit` + Effect language-service diagnostics in every package |
| `npm test` | Unit and service tests (Vitest); fails below 100% coverage (report in `coverage/`) |
| `npm run test:int` | DB integration tests against an ephemeral, migrated PostgreSQL: `TEST_DATABASE_URL` if set, otherwise a Testcontainers container (needs Docker) |
| `npm run test:e2e` | Browser tests with agent-browser; starts `next start` (run `npm run build` first) against the same ephemeral database, or uses `E2E_BASE_URL` |
| `npm run db:migration:create` | Generate a migration from the entity/schema diff |
| `npm run db:migration:up` / `down` | Apply / revert migrations |
| `npm run db:migration:list` | List applied migrations |

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on pushes to `main`. Each job is a separate check: `lint`, `typecheck`, `unit (100% coverage)`, `build`, `integration (Testcontainers PostgreSQL)` and `e2e (agent-browser + Testcontainers PostgreSQL)`. A pull request is merged only when all of them are green for its latest commit. The `main` ruleset enforces this: pull requests only, all six checks required on an up-to-date branch, resolved review threads, no force-push or deletion, no bypass.

## Architecture

### Monorepo layout

```
.
├── packages/
│   ├── app/    @devmentor/app   Next.js application
│   ├── core/   @devmentor/core  framework-agnostic code (errors, Zod schemas/config, HTTP mapping, DI)
│   ├── db/     @devmentor/db    MikroORM config, entities, migrations, Db service, transactions
│   └── ui/     @devmentor/ui    reusable React components (shadcn/ui + public-site components)
├── tsconfig.base.json           shared TypeScript settings
├── eslint.config.mjs            one ESLint config for the whole repo (incl. package boundaries)
├── vitest.config.mts            test projects: unit, int, e2e
├── docker-compose.yml           local PostgreSQL
├── AGENTS.md                    rules for coding agents (stack and architecture contract)
└── .ai/                         specs, run logs and lessons for AI-assisted development
```

Dependencies between packages flow one way:

```
          ┌──────────────┐
          │ @devmentor/  │
          │     app      │
          └──┬────┬────┬─┘
             │    │    │
     ┌───────┘    │    └────────┐
     ▼            ▼             ▼
┌─────────┐  ┌─────────┐   ┌─────────┐
│   ui    │  │   db    │──▶│  core   │
└─────────┘  └─────────┘   └─────────┘
```

`core` and `ui` have no internal dependencies. Nothing imports from `app`.

**Internal packages ship TypeScript source.** There is no separate build step: each package's `package.json#exports` points at files in `src/`, and Next.js/Turbopack transpiles workspace packages when it bundles the app. Each package is type-checked on its own with `tsc --noEmit`.

### `@devmentor/app` (Next.js)

```
packages/app/src/
├── app/
│   ├── (frontend)/           public site: root layout + Tailwind (frontend.css)
│   ├── (backend)/backend/    admin area at /backend: root layout + shadcn/ui theme
│   └── api/health/route.ts   reference route handler (effectRoute)
├── di/container.ts           Awilix: ORM + per-request EntityManager scope
├── server/                   Effect runtime, runRequest, effectRoute, effectAction
└── modules/<module>/         feature code: schemas.ts, *-service.ts, actions.ts, __tests__/
packages/app/e2e/             agent-browser e2e tests
```

`(frontend)` and `(backend)` are separate root layouts. The public site and the admin area each load only their own stylesheet: Tailwind with the DevMentor theme for the public site, and the shadcn/ui design tokens for the admin area. Moving between the two areas is a full page load.

### Backend: Effect + Zod

Full standards: `.ai/specs/implemented/2026-10-19-engineering-standards.md`.

- **Services** are `Context.Service` classes with a static `layer`, composed into `AppLayer` in `packages/app/src/server/runtime.ts`. One `ManagedRuntime` per process (lazy, HMR-safe) runs them.
- **Edge code** (route handlers, server actions, server components) runs effects only through `runRequest`, which provides a fresh MikroORM `EntityManager` fork as the `Db` service plus a `RequestContext` (request id), wires `request.signal` to interruption and logs unexpected failures.
- **`effectRoute` / `effectAction`** decode inputs with Zod, run the handler, encode the output through a response schema (undeclared fields never leave the server) and map errors.
- **Errors** are tagged (`@devmentor/core/errors`) and map to one HTTP status each: `ValidationError` 400, `Unauthorized` 401, `Forbidden` 403, `NotFound` 404, `Conflict` 409, `BusinessRuleViolation` 422, `DbError`/defects 500 (generic message). Body: `{ "error": { "code", "message", "details"? } }`.
- **Awilix** only bootstraps infrastructure: the ORM and the per-request `em` (`packages/app/src/di/container.ts`).

```ts
// packages/app/src/app/api/health/route.ts
export const GET = effectRoute({ response: HealthDto }, () =>
  HealthService.use((health) => health.check()),
);
```

### Database (MikroORM + PostgreSQL)

- **Entities** live in `packages/db/src/entities/` and use `defineEntity` rather than decorators, so the same code runs under Turbopack, the MikroORM CLI and plain Node. Every entity is listed in `entities/index.ts`.
- **ORM lifecycle:** `getOrm()` lazily creates a single `MikroORM` instance per process, which means one connection pool. It is cached on `globalThis`. Nothing connects at import time, so `next build` runs without a database.
- **Connection pooling** is configured through env: `DB_POOL_MIN` and `DB_POOL_MAX`.
- **Unit of work per request:** the container registers `em` as a scoped `orm.em.fork()`; `runRequest` provides it as the Effect `Db` service. Queries go through `dbTry((em) => ...)` (maps unique violations to `Conflict`, etc.) and `withTransaction(effect)` commits or rolls back.
- **Base columns:** `baseProperties()` adds a UUIDv7 `id`, `createdAt` and `updatedAt` to an entity.
- **Migrations** live in `packages/db/src/migrations/` and are managed with the MikroORM CLI (`npm run db:migration:*`). The CLI config `packages/db/src/mikro-orm.config.ts` adds the Migrator. The Next.js runtime doesn't need it.
- MikroORM packages are kept out of the server bundle via `serverExternalPackages` in `packages/app/next.config.ts`.

### UI (Tailwind + shadcn/ui)

- `packages/ui/src/components/`: shadcn/ui primitives for the admin area. Add new ones with the shadcn CLI from the ui package:
  ```bash
  cd packages/ui && npx shadcn@latest add dialog
  ```
- `packages/ui/src/frontend/`: shared public-site components (plain Tailwind).
- `packages/ui/src/styles/globals.css`: Tailwind and shadcn theme tokens, imported by the backend layout.
- `@devmentor/ui/lib/utils` exports `cn()` for merging class names.

### Configuration

Environment variables are read from `packages/app/.env*`, the Next.js project directory. The MikroORM CLI loads the same files. Variables already set in the process environment take precedence. They are validated with Zod by `parseEnv()` in `@devmentor/core/config`; invalid values fail fast with a `ConfigError`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | – | PostgreSQL connection URL |
| `DB_POOL_MIN` | no | `0` | Minimum pool connections |
| `DB_POOL_MAX` | no | `10` | Maximum pool connections |
| `DB_DEBUG` | no | `false` | Log SQL queries |
| `TEST_DATABASE_URL` | no | – | Separate PostgreSQL database for `test:int` / `test:e2e` (never the dev or shared one). Unset: Testcontainers starts one |
| `E2E_BASE_URL` | no | – | Run e2e tests against an already running app |

## Working with AI coding agents

`AGENTS.md` is the binding contract for coding agents: stack, package boundaries, DB/DI/UI conventions and verification steps. Specs, run logs and lessons live in `.ai/`, as described in `AGENTS.md`.
