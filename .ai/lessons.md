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

- [2026-10-20 openmercato-skill-lint](lessons/2026-10-20-openmercato-skill-lint.md) — run the repository formatter on installed OpenMercato scripts before committing them
- [2026-10-19 junit-reporter-holds-output-file-open](lessons/2026-10-19-junit-reporter-holds-output-file-open.md) — don't delete a reporter's output dir from global setup; verify evidence files, not log lines
- [2026-10-19 sandbox-has-no-docker](lessons/2026-10-19-sandbox-has-no-docker.md) — known limitation: run DB tests locally via `TEST_DATABASE_URL` (throwaway cluster), Testcontainers path is verified in CI
- [2026-10-19 test-workers-need-injected-database-url](lessons/2026-10-19-test-workers-need-injected-database-url.md) — pass the Testcontainers URL to workers via `provide`/`inject`; prove isolation with an unreachable shell `DATABASE_URL`
- [2026-10-19 agent-browser-linux-deps-and-process-groups](lessons/2026-10-19-agent-browser-linux-deps-and-process-groups.md) — `agent-browser install --with-deps` on Linux; spawned e2e servers must be killed by process group
- [2026-10-19 effect-v4-gotchas](lessons/2026-10-19-effect-v4-gotchas.md) — `yield* Tag`/`Tag.use` (no `asEffect`), hooks lint misreads `Tag.use` in .tsx, Effect diagnostics catch what tsc misses
- [2026-10-19 keep-solutions-simple](lessons/2026-10-19-keep-solutions-simple.md) — build only what is needed/requested; justify every new dependency, layer or pattern
- [2026-10-19 use-agent-browser-for-e2e](lessons/2026-10-19-use-agent-browser-for-e2e.md) — e2e tests and UI checks use the `agent-browser` CLI, never Playwright
- [2026-10-19 sandbox-database-url-overrides-env-files](lessons/2026-10-19-sandbox-database-url-overrides-env-files.md) — sandbox `DATABASE_URL` (shared `open-mercato` DB) beats `.env.local`; check it before migrating
- [2026-10-19 sandbox-node-env-breaks-build](lessons/2026-10-19-sandbox-node-env-breaks-build.md) — `NODE_ENV=development` in the shell breaks `next build`; use `NODE_ENV=production npm run build`
- [2026-10-19 turbopack-import-meta-url-and-next-env](lessons/2026-10-19-turbopack-import-meta-url-and-next-env.md) — no `new URL(..., import.meta.url)` in bundled code; default-import `@next/env` in ESM
