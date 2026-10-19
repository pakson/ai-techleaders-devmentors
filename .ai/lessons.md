# Lessons

Index of long-term learnings recorded by humans and LLMs. Read this file before starting any task. Detailed write-ups live in `.ai/lessons/`.

## How to use

- Add one line per lesson to the index below, newest first.
- Put the full write-up in `.ai/lessons/YYYY-MM-DD-slug.md`.
- Keep entries short, concrete and actionable. Update or remove lessons that turn out to be wrong instead of adding contradictions.

## Lesson file template

```markdown
# <Title>

- Date: YYYY-MM-DD
- Context: <task, bug or spec this came from>

## Finding
<What was learned / what went wrong>

## Resolution
<What fixed it or what to do instead>

## Rule going forward
<One or two sentences an agent can follow>
```

## Index

<!-- Format: - [YYYY-MM-DD slug](lessons/YYYY-MM-DD-slug.md) — one-line summary -->

- [2026-10-19 sandbox-database-url-overrides-env-files](lessons/2026-10-19-sandbox-database-url-overrides-env-files.md) — sandbox `DATABASE_URL` (shared `open-mercato` DB) beats `.env.local`; check it before migrating
- [2026-10-19 sandbox-node-env-breaks-build](lessons/2026-10-19-sandbox-node-env-breaks-build.md) — `NODE_ENV=development` in the shell breaks `next build`; use `NODE_ENV=production npm run build`
- [2026-10-19 turbopack-import-meta-url-and-next-env](lessons/2026-10-19-turbopack-import-meta-url-and-next-env.md) — no `new URL(..., import.meta.url)` in bundled code; default-import `@next/env` in ESM
