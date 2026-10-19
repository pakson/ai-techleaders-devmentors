# DevMentor monorepo architecture

- Date: 2026-10-19
- Status: implemented (2026-10-19)

## Goal

Turn the single-package Next.js starter into the **DevMentor** monorepo. It sets the baseline stack and package layout that all later work builds on.

## Stack (fixed decisions)

| Concern | Choice |
| --- | --- |
| Framework | Latest Next.js (App Router) + React + TypeScript (strict) |
| Database | PostgreSQL |
| ORM | MikroORM (`@mikro-orm/postgresql`), with migrations (`@mikro-orm/migrations`) and connection pooling (`pool` option) |
| DI container | Awilix |
| Frontend (public) pages styling | Tailwind CSS |
| Backend (admin) pages UI | shadcn/ui (built on Tailwind) |
| Monorepo tooling | npm workspaces (`packages/*`) |

## Package layout

```
packages/
├── app/   @devmentor/app   – Next.js application (routes, composition root, feature wiring)
├── core/  @devmentor/core  – framework-agnostic reusable logic: DI container helpers, config, errors, shared types
├── db/    @devmentor/db    – MikroORM config, entities, migrations, ORM/EM helpers, repositories
└── ui/    @devmentor/ui    – reusable React components; shadcn/ui primitives for backend pages
```

Dependency direction (no cycles): `app → ui, db, core`; `db → core`; `ui` → none of the internal packages (only peer React). `core` depends on no internal package.

## Key design points

1. **Internal packages ship TypeScript source** (no build step). `package.json#exports` points at `src/*.ts`. Next/Turbopack transpiles workspace packages automatically. Type checking runs per package with `tsc --noEmit`.
2. **No decorators in entities.** Entities use MikroORM's `defineEntity` helper. This avoids relying on `experimentalDecorators`/`emitDecoratorMetadata` under Turbopack/SWC.
3. **DI.** `@devmentor/core` exposes `createAppContainer()` (Awilix, `InjectionMode.PROXY`, strict mode). `@devmentor/db` exposes a registration function. It registers the `MikroORM` instance as a singleton and the `EntityManager` as a *scoped* fork. The app composes them in `packages/app/src/di/container.ts`. Per-request work uses `container.createScope()`.
4. **ORM lifecycle.** One `MikroORM` instance per process. It is cached on `globalThis` so dev HMR doesn't leak connections. It is created lazily on first use, never at import time, so `next build` works without a database.
5. **Config.** `DATABASE_URL` plus optional `DB_POOL_MIN`/`DB_POOL_MAX`/`DB_DEBUG`, parsed in `@devmentor/db` (`createOrmConfig`). Env files live in `packages/app/` (the Next.js project dir, loaded natively). The MikroORM CLI loads the same files via `@next/env`. Commit `.env.example`, never real `.env` files.
6. **Migrations.** They live in `packages/db/src/migrations`. Run them with `npm run db:migration:create|up|down|list`. The Migrator extension and migration paths are configured **only** in the CLI config `packages/db/src/mikro-orm.config.ts`, because Turbopack would try to bundle `new URL(..., import.meta.url)` paths in runtime code.
7. **Routing split.** Two separate root layouts in route groups:
   - `packages/app/src/app/(frontend)/…`: public pages, plain Tailwind (`frontend.css`).
   - `packages/app/src/app/(backend)/backend/…`: admin pages at `/backend`, shadcn/ui components from `@devmentor/ui`, theme `@devmentor/ui/globals.css`.
8. **Tailwind v4** via `@tailwindcss/postcss` in the app. Each root layout imports its own CSS entry, so the public theme and shadcn tokens never mix. shadcn/ui is set up in the shadcn monorepo layout: `components.json` in both `packages/ui` and `packages/app`, style `radix-nova`, aliases `@devmentor/ui/*`, and `cn` from the `cn` package.
9. **Root scripts** forward to the app workspace (`dev`, `build`, `start`). `lint` and `typecheck` run across the repo. The existing preview command `npm run dev -- --hostname 0.0.0.0 --port 3000` keeps working.

## Deliverables

- Monorepo restructure (move the current `src/`, `public/` and Next config into `packages/app`).
- Minimal working skeletons of `core`, `db`, `ui`, including an example entity and an initial migration.
- A health route handler (`/api/health`) that resolves the container and shows how DI works.
- `AGENTS.md` that records all the assumptions above as rules for coding agents.
- `README.md` with architecture notes.

## Implementation notes

- Versions at implementation: next 16.4.2, react 19.2.8, @mikro-orm/* 7.2.5, awilix 13.0.5, tailwindcss 4.3.3, shadcn 4.22.1, typescript 5.9 (TS 7 deliberately not adopted yet).
- Shared dev tooling (TypeScript, ESLint, `@types/*`) is in the root `package.json`. `tsx` is a devDependency of `@devmentor/db` (MikroORM CLI TypeScript loader).
- `docker-compose.yml` provides local Postgres 17.

## Out of scope

Authentication, real domain model, CI, Docker setup (a `docker-compose.yml` for local Postgres is a nice-to-have).
