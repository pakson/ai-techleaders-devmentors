<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# DevMentor — architecture and stack (mandatory)

**DevMentor** is an npm-workspaces monorepo. The stack and layout below are fixed project decisions. Don't swap a technology, add a parallel alternative (another ORM, DI library, CSS framework or component kit) or change the package layout without explicit user approval and a spec. Full rationale is in `.ai/specs/implemented/2026-10-19-monorepo-architecture.md`.

## Stack

| Concern | Use | Don't use |
| --- | --- | --- |
| Framework | Latest **Next.js** (App Router, Turbopack) + **React** + **TypeScript** (`strict`) | Pages Router, plain JS files |
| Database | **PostgreSQL** | other databases |
| Data access | **MikroORM** (`@mikro-orm/postgresql`): migrations via `@mikro-orm/migrations`, connection pooling via the `pool` option | Prisma, Drizzle, TypeORM, raw `pg` pools |
| Dependency injection | **Awilix** (via `@devmentor/core`) | ad-hoc singletons, other DI libraries |
| Frontend (public) pages | **Tailwind CSS** v4 utilities | CSS-in-JS, other CSS frameworks |
| Backend (admin) pages | **shadcn/ui** components from `@devmentor/ui` (Tailwind-based) | other component kits |
| Package manager | **npm** workspaces (keep `package-lock.json` committed) | pnpm/yarn/bun |

Node.js >= 22.17 (required by MikroORM 7).

## Packages (`packages/*`)

| Package | Name | Responsibility |
| --- | --- | --- |
| `packages/app` | `@devmentor/app` | The Next.js application: routes, pages, route handlers, server actions, app services, DI composition root (`src/di/container.ts`) |
| `packages/core` | `@devmentor/core` | Framework-agnostic reusable code: Awilix container factory and helpers, env/config readers, error types, shared types. No React, no Next, no ORM |
| `packages/db` | `@devmentor/db` | Data management: MikroORM config, entities, migrations, ORM lifecycle (`getOrm`), DI registration (`registerDb`), repositories and DB helpers |
| `packages/ui` | `@devmentor/ui` | Reusable React UI: shadcn/ui primitives (`src/components`), shared public-site components (`src/frontend`), `cn` helper, theme CSS (`src/styles/globals.css`) |

Rules:

- **Dependency direction:** `app → ui, db, core` and `db → core`. `core` and `ui` import no internal package. No cycles. Never import from `@devmentor/app` in another package.
- Put new code in the lowest package where it fits. Reusable non-UI logic goes in `core`, anything touching the database goes in `db`, reusable components go in `ui`, and app-specific wiring stays in `app`.
- **Internal packages ship TypeScript source.** There is no build step: `package.json#exports` points to `src`. Turbopack transpiles workspace packages. Every importable path must be listed in `exports`; import through the package name (`@devmentor/db`, `@devmentor/ui/components/button`), never through relative `../../packages/...` paths.
- Internal dependencies use `"*"` versions. Add third-party deps to the package that uses them (`npm i <pkg> -w @devmentor/<name>`). Shared dev tooling (TypeScript, ESLint, `@types/*`) lives in the root `package.json`.
- Every package has a `tsconfig.json` extending `tsconfig.base.json` and a `typecheck` script.
- Code that runs in Turbopack-bundled server code must not use `new URL("./relative", import.meta.url)`, because Turbopack treats it as an asset import. Keep file-system paths in CLI-only modules.

## Database (MikroORM + PostgreSQL)

- Define entities with **`defineEntity` + `setClass`** (no decorators) in `packages/db/src/entities/`, and add each one to the `entities` array in `entities/index.ts`.
- Change the schema **only through migrations**: edit entities, then run `npm run db:migration:create`, review the generated file in `packages/db/src/migrations/`, and commit it. Apply with `npm run db:migration:up`. Never use `schema:update` against shared databases, and never edit an applied migration.
- Use one `MikroORM` instance per process via `getOrm()` (lazy and HMR-safe). Never initialize the ORM at module import time, because `next build` must work without a database.
- Never use the global `orm.em` in request code. Resolve the **scoped `em`** from a container scope (a fork with its own identity map).
- Connection settings come from env: `DATABASE_URL` (required), `DB_POOL_MIN`, `DB_POOL_MAX`, `DB_DEBUG`. Read them through `createOrmConfig()`, not ad hoc.
- `packages/db/src/mikro-orm.config.ts` is **CLI-only**: it adds the Migrator and migration paths. The Next.js runtime uses `createOrmConfig()` without them. MikroORM driver packages are listed in `serverExternalPackages` in `packages/app/next.config.ts`; add any new `@mikro-orm/*` runtime package there too.

## Dependency injection (Awilix)

- Create containers only with `createAppContainer()` from `@devmentor/core`: `InjectionMode.PROXY`, `strict: true`.
- Each package/feature exposes a registration function (a `ContainerModule`, e.g. `registerDb(orm)`) and a cradle interface (e.g. `DbCradle`). The app composes them in `packages/app/src/di/container.ts` and extends `AppCradle`.
- Services are classes or factories that take their dependencies from the cradle object (`constructor({ em }: Pick<AppCradle, "em">)`). Don't import other services directly, and don't call `getContainer()` inside services.
- Lifetimes: anything depending on `em` (directly or indirectly) is `.scoped()`. Stateless or process-wide things are `.singleton()`. Strict mode rejects singletons that depend on scoped registrations, so don't work around it.
- In route handlers, server actions and server components, call `createRequestScope()` once per unit of work and resolve from `scope.cradle`.

## UI and routing

- Public pages live in `packages/app/src/app/(frontend)/` and are styled with **Tailwind utilities**. Their root layout imports `(frontend)/frontend.css`. Shared public components go in `packages/ui/src/frontend/`.
- Admin pages live in `packages/app/src/app/(backend)/backend/` (URL `/backend/...`) and are built from **shadcn/ui** components. Their root layout imports `@devmentor/ui/globals.css` (shadcn theme tokens).
- `(frontend)` and `(backend)` are **separate root layouts**: their styles never mix, and navigating between them is a full page load (use `<a>`, not `<Link>`, for cross-area links).
- Add shadcn components with the CLI from the ui package: `cd packages/ui && npx shadcn@latest add <component>`. They land in `packages/ui/src/components/`. Don't hand-copy them into the app. Import as `@devmentor/ui/components/<name>`.
- Use `cn` from `@devmentor/ui/lib/utils` to merge class names.
- Pages that read the database must render at request time (e.g. `await connection()` from `next/server`) so data isn't baked in at build.

## Environment and commands

- Env files live in `packages/app/` (`.env.local`, from `.env.example`). The MikroORM CLI loads the same files. Real environment variables override `.env*` files. Never commit real `.env` files.
- Root scripts: `npm run dev | build | start` (forward to the app), `npm run lint`, `npm run typecheck` (all packages), `npm run db:migration:create | up | down | list`.
- Before declaring work done: `npm run lint`, `npm run typecheck` and `npm run build` must pass.

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

- **Plan complex tasks first.** For multi-file, ambiguous or architectural work, explore and plan before editing. Get user approval and capture the plan in a spec (see Specs). Aim to implement it in one pass. If the work goes sideways, stop and re-plan; don't keep patching.
- **Verify every change.** Before declaring work done, run `npm run lint`, `npm run typecheck` and `npm run build`. For UI changes, run the app (`npm run dev`) and check the affected page. Report results truthfully: state what failed and what was not verified.
- **Fix bugs end-to-end.** Given a bug report or failing check, find the root cause from logs, errors and code, fix it, and verify the fix without asking for step-by-step guidance. Record a lesson if the cause was non-obvious.
- **Prefer the elegant solution.** If a fix turns out hacky, replace it with the clean solution rather than layering workarounds.
- **Use subagents for breadth.** Delegate wide searches, research and independent subtasks to subagents. This keeps the main context focused. Parallel work on separate tasks should use separate git worktrees.
- **Automate repetition.** If you perform a workflow repeatedly, propose turning it into a committed skill or slash command.
