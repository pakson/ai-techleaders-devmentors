<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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
- **Verify every change.** Before declaring work done, run `npm run lint` and `npm run build`. For UI changes, run the app (`npm run dev`) and check the affected page. Report results truthfully: state what failed and what was not verified.
- **Fix bugs end-to-end.** Given a bug report or failing check, find the root cause from logs, errors and code, fix it, and verify the fix without asking for step-by-step guidance. Record a lesson if the cause was non-obvious.
- **Prefer the elegant solution.** If a fix turns out hacky, replace it with the clean solution rather than layering workarounds.
- **Use subagents for breadth.** Delegate wide searches, research and independent subtasks to subagents. This keeps the main context focused. Parallel work on separate tasks should use separate git worktrees.
- **Automate repetition.** If you perform a workflow repeatedly, propose turning it into a committed skill or slash command.
