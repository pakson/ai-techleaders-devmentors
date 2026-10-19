# DevMentor

DevMentor is a Next.js application in an npm-workspaces monorepo.

| Concern | Technology |
| --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Turbopack), React 19, TypeScript (strict) |
| Database | PostgreSQL |
| ORM | [MikroORM](https://mikro-orm.io) 7: entities, migrations, connection pooling |
| Dependency injection | [Awilix](https://github.com/jeffijoe/awilix) |
| Public pages | [Tailwind CSS](https://tailwindcss.com) 4 |
| Admin (backend) pages | [shadcn/ui](https://ui.shadcn.com) |

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
- http://localhost:3000/api/health: health check (resolves a service from the DI container and pings the database)

## Scripts (run from the repo root)

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server (forwarded to `@devmentor/app`) |
| `npm run lint` | ESLint across the whole repo |
| `npm run typecheck` | `tsc --noEmit` in every package |
| `npm run db:migration:create` | Generate a migration from the entity/schema diff |
| `npm run db:migration:up` / `down` | Apply / revert migrations |
| `npm run db:migration:list` | List applied migrations |

## Architecture

### Monorepo layout

```
.
├── packages/
│   ├── app/    @devmentor/app   Next.js application
│   ├── core/   @devmentor/core  framework-agnostic reusable code (DI, config, errors)
│   ├── db/     @devmentor/db    MikroORM config, entities, migrations, ORM helpers
│   └── ui/     @devmentor/ui    reusable React components (shadcn/ui + public-site components)
├── tsconfig.base.json           shared TypeScript settings
├── eslint.config.mjs            one ESLint config for the whole repo
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
│   └── api/health/route.ts   example route handler using the DI container
├── di/container.ts           composition root (Awilix container + request scopes)
└── services/                 application services resolved from the container
```

`(frontend)` and `(backend)` are separate root layouts. The public site and the admin area each load only their own stylesheet: Tailwind with the DevMentor theme for the public site, and the shadcn/ui design tokens for the admin area. Moving between the two areas is a full page load.

### Dependency injection (Awilix)

- `@devmentor/core` provides `createAppContainer()`, which uses `InjectionMode.PROXY` and `strict: true`. It also provides the `ContainerModule` type.
- Each package registers its own services through a module function and describes them with a cradle interface. For example, `@devmentor/db` exports `registerDb(orm)` and `DbCradle`.
- The app composes the modules in `packages/app/src/di/container.ts`. The container is created once per process and cached on `globalThis` so it survives dev HMR.
- Each request or server action runs in its own scope from `createRequestScope()`. Scoped registrations, notably the MikroORM `EntityManager`, are fresh in every scope.

```ts
const scope = await createRequestScope();
const health = await scope.cradle.healthService.check();
```

Services receive dependencies from the cradle:

```ts
export class HealthService {
  constructor({ em }: Pick<DbCradle, "em">) { /* ... */ }
}
```

### Database (MikroORM + PostgreSQL)

- **Entities** live in `packages/db/src/entities/` and use `defineEntity` rather than decorators, so the same code runs under Turbopack, the MikroORM CLI and plain Node. Every entity is listed in `entities/index.ts`.
- **ORM lifecycle:** `getOrm()` lazily creates a single `MikroORM` instance per process, which means one connection pool. It is cached on `globalThis`. Nothing connects at import time, so `next build` runs without a database.
- **Connection pooling** is configured through env: `DB_POOL_MIN` and `DB_POOL_MAX`.
- **Unit of work per request:** the container registers `em` as a scoped `orm.em.fork()`.
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

Environment variables are read from `packages/app/.env*`, the Next.js project directory. The MikroORM CLI loads the same files. Variables already set in the process environment take precedence.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | – | PostgreSQL connection URL |
| `DB_POOL_MIN` | no | `0` | Minimum pool connections |
| `DB_POOL_MAX` | no | `10` | Maximum pool connections |
| `DB_DEBUG` | no | `false` | Log SQL queries |

## Working with AI coding agents

`AGENTS.md` is the binding contract for coding agents: stack, package boundaries, DB/DI/UI conventions and verification steps. Specs, run logs and lessons live in `.ai/`, as described in `AGENTS.md`.
