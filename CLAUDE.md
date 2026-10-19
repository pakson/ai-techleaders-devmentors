@AGENTS.md

# `.ai/` workspace — summary (full rules in AGENTS.md)

Claude MUST follow the `.ai/` conventions defined in AGENTS.md:

- `.ai/specs/` — SDD specifications named `YYYY-MM-DD-slug.md`. Check for a relevant spec before implementing; write one first if missing. Move finished specs to `.ai/specs/implemented/` and obsolete ones to `.ai/specs/archive/`. Never delete specs.
- `.ai/runs/` — log every autonomous run in `.ai/runs/YYYY-MM-DD-slug.md` (goal, spec, steps, decisions, files changed, results, open issues).
- `.ai/lessons.md` + `.ai/lessons/` — read the index at the start of every task. After fixing a bug, getting a correction, or learning something worth keeping, write `.ai/lessons/YYYY-MM-DD-slug.md` and add an index line to `.ai/lessons.md`.

# DevMentor stack — summary (full rules in AGENTS.md)

npm-workspaces monorepo: `packages/app` (Next.js, modules, Effect edge adapters), `packages/core` (errors, Zod schemas/config, Awilix helpers), `packages/db` (MikroORM + PostgreSQL, migrations, `Db`/`withTransaction`), `packages/ui` (shadcn/ui + shared components). Backend code is Effect 4 (services as Layers) with Zod 4 at every boundary; Awilix only bootstraps the ORM and per-request `em`. Tailwind for public pages, shadcn/ui for `/backend` pages, Vitest + agent-browser for tests. Don't change the stack or the package boundaries without user approval.

# How to implement — summary (full rules in AGENTS.md, "Planning and executing implementation tasks")

- Split every task into minimal vertical slices: one end-to-end scenario per slice, each shippable on its own (lint, typecheck, tests and build green).
- Per slice, use TDD: write failing tests for its scenarios (red), implement until green, then refactor. Tests must cover every implemented scenario, and unit tests must cover 100% of the code (`npm test` enforces it).
- Merge a PR only after every CI check has finished and is green for its latest commit (`gh pr checks <n> --watch`).
- Never weaken, skip or rewrite tests to make an implementation pass. Fix the code, or stop and explain if the requirement itself was wrong.
