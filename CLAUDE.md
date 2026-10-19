@AGENTS.md

# `.ai/` workspace — summary (full rules in AGENTS.md)

Claude MUST follow the `.ai/` conventions defined in AGENTS.md:

- `.ai/specs/` — SDD specifications named `YYYY-MM-DD-slug.md`. Check for a relevant spec before implementing; write one first if missing. Move finished specs to `.ai/specs/implemented/` and obsolete ones to `.ai/specs/archive/`. Never delete specs.
- `.ai/runs/` — log every autonomous run in `.ai/runs/YYYY-MM-DD-slug.md` (goal, spec, steps, decisions, files changed, results, open issues).
- `.ai/lessons.md` + `.ai/lessons/` — read the index at the start of every task. After fixing a bug, getting a correction, or learning something worth keeping, write `.ai/lessons/YYYY-MM-DD-slug.md` and add an index line to `.ai/lessons.md`.

# DevMentor stack — summary (full rules in AGENTS.md)

npm-workspaces monorepo: `packages/app` (Next.js), `packages/core` (DI/config/errors), `packages/db` (MikroORM + PostgreSQL, migrations), `packages/ui` (shadcn/ui + shared components). Awilix for DI, Tailwind for public pages, shadcn/ui for `/backend` pages. Don't change the stack or the package boundaries without user approval.
