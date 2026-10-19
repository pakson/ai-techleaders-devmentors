# Run: DevMentor monorepo architecture

- Date: 2026-10-19
- Spec: [.ai/specs/implemented/2026-10-19-monorepo-architecture.md](../specs/implemented/2026-10-19-monorepo-architecture.md)

## Goal

Restructure the repo into the npm-workspaces monorepo (`app`, `core`, `db`, `ui`) on the latest Next.js. Stack: MikroORM/PostgreSQL, Awilix, Tailwind, shadcn/ui. Document the assumptions in AGENTS.md and README.md.

## Steps

- Read `.ai/lessons.md` (no lessons yet), AGENTS.md, the Next 16 docs (`transpilePackages`, `serverExternalPackages`, CSS/Tailwind).
- Checked current registry versions: next 16.4.2, @mikro-orm/* 7.2.5 (Kysely-based, Node >= 22.17), awilix 13.0.5, tailwindcss 4.3.3, shadcn 4.22.1.
- Wrote the spec.
- Restructured into npm workspaces: moved `src/`, `public/` and `next.config.ts` into `packages/app`. Removed the starter screen (`backdrop.tsx`, `page.module.css`, starter CSS). Regenerated `package-lock.json`.
- Installed: next 16.4.2 (upgraded from 16.3.4), @mikro-orm/{core,postgresql,migrations,cli} 7.2.5, awilix 13.0.5, tailwindcss + @tailwindcss/postcss 4.3.3, shadcn 4.22.1 (+ radix-ui, cva, cn, lucide-react, tw-animate-css), tsx, @next/env.
- `@devmentor/core`: `createAppContainer` (PROXY, strict), `ContainerModule`, Awilix re-exports, env readers, `AppError`/`ConfigError`.
- `@devmentor/db`: `createOrmConfig`, lazy HMR-safe `getOrm`/`closeOrm`, `registerDb` + `DbCradle` (scoped `em` fork), example `User` entity (`defineEntity`), CLI config with Migrator, initial migration `Migration20261019184207`.
- `@devmentor/ui`: shadcn monorepo setup (layout copied from a scratch `shadcn init --monorepo` in /tmp). Components button, card, badge, table, separator via the shadcn CLI. `frontend/container.tsx`. `globals.css` theme.
- `@devmentor/app`: `(frontend)` and `(backend)` root layouts, home page, `/backend` dashboard (shadcn, DB status), `/api/health`, DI composition root, `HealthService`, `.env.example`.
- Root: `tsconfig.base.json`, solution-style `tsconfig.json`, monorepo-aware `eslint.config.mjs` and `.gitignore`, `docker-compose.yml`.
- AGENTS.md: added the "DevMentor — architecture and stack" section. README.md rewritten with architecture notes.

## Decisions

- **npm workspaces** (existing lockfile, preview command uses npm). No Turborepo; not needed yet.
- **Source-only internal packages**: no build step. Turbopack transpiles workspace packages.
- **`defineEntity` instead of decorators**: avoids decorator metadata issues under SWC/Turbopack. It's the MikroORM 7 recommended style.
- **Migrator only in the CLI config**: Turbopack failed on `new URL("./migrations", import.meta.url)` in runtime code.
- **Separate root layouts** for frontend and backend, so the Tailwind public theme and the shadcn tokens don't conflict.
- **TypeScript 5.9 rather than 7.0**: Next's type-check step relies on the TS 5 JS API.
- **Env files in `packages/app/`** (native Next loading). The db CLI reuses them via `@next/env`.

## Verification

- `npm run typecheck`: pass (all 4 packages).
- `npm run lint`: pass.
- `npm run build`: **fails in this sandbox** because the shell exports `NODE_ENV=development` (prerender `useContext` null error). `NODE_ENV=production npm run build`: pass (`/` static; `/backend` and `/api/health` dynamic). See lesson.
- Migrations: `db:migration:create --initial`, `up` and `list` work. Verified against a throwaway Postgres cluster on port 5433.
- Dev preview (port 3000): `/`, `/backend` ("Connected") and `/api/health` (`{"status":"ok"}`) return 200. Each area loads only its own CSS.
- `next start` with an unreachable DB: `/api/health` returns 503 with an error message, `/backend` shows "Unavailable", `/` returns 200.

## Open issues

- **Shared DB was modified.** The sandbox's `DATABASE_URL` (`open-mercato` on 127.0.0.1:5432) took precedence over `.env.local`, so the first `db:migration:up` created `users` and `mikro_orm_migrations` there. Rollback (`migration:down` + dropping the migrations table) was blocked by the permission classifier, so it's left for the user to decide.
- Snapshot: MikroORM names its schema snapshot after the database (`.snapshot-<dbName>.json`), which produced an `open-mercato` copy. Set `snapshotName: ".snapshot"` so one environment-independent `.snapshot.json` is committed.
- `unrs-resolver` postinstall script is not approved (npm `install-scripts`); ESLint works without it.
- Next steps: auth for `/backend`, real domain entities, CI (lint/typecheck/build), tests.
