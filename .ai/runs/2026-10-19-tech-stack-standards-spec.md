# Run: Tech stack, engineering standards and design patterns spec

- Date: 2026-10-19
- Spec: [.ai/specs/implemented/2026-10-19-engineering-standards.md](../specs/implemented/2026-10-19-engineering-standards.md) (draft at the time of this run; implemented later the same day)

## Goal

Research Open Mercato and Medusa.js, plus Effect and Zod, and write a spec for the DevMentor tech stack, engineering standards, coding standards and design patterns. User wants Zod for input/output validation and Effect on the backend. Deliver a synthesis for review before any implementation.

## Steps

- Read `.ai/lessons.md`, AGENTS.md, the implemented monorepo spec, current DI/db code.
- Launched three parallel research subagents: Open Mercato repo, Medusa v2 repo, Effect (+ Zod interop, Awilix/MikroORM integration).
- Research results:
  - Open Mercato v0.9.0 (Next 16, MikroORM 7 with legacy decorators, Awilix CLASSIC with a new container per request, Zod 4, Yarn+Turbo, codegen registries, 3.3k-line CRUD factory, command bus with undo, feature-based ACL).
  - Medusa v2.21 (MikroORM 6, Awilix 8, Zod 4, module isolation, `defineLink`, `MedusaService` CRUD generation, workflow DSL with compensation, decorator context threading, closed `MedusaError` taxonomy, ~75 custom lint rules).
  - Effect 4.0.5 is stable/LTS (released 2026-10-01). `@effect/platform`/`@effect/sql` are merged into `effect`; `http`/`http-api`/`sql` are marked unstable. Zod 4.6.7 implements Standard Schema.
- Checked versions with `npm view`: effect 4.0.5, @effect/vitest 4.0.5 (vitest >=5 <6), zod 4.6.7, zod-openapi 6.0.2, vitest 5.0.5, @playwright/test 1.64.1, react-hook-form 7.90.0, uuidv7 1.2.1, prettier 3.9.10.
- Wrote the draft spec `.ai/specs/2026-10-19-engineering-standards.md` with 9 decisions (D1–D9) for user review.

## Decisions (proposed, pending approval)

- Effect Layers own the backend service graph. Awilix is reduced to infrastructure bootstrapping (D1), because two full DI graphs is the worst long-term outcome; this needs approval because AGENTS.md mandates Awilix.
- Services are built once; request context (`Db`, `RequestContext`) goes in the `R` channel. This replaces Medusa's decorator/sharedContext threading.
- Zod at every boundary, no Effect Schema (D5). Next route handlers/actions, not `effect/http-api` (D4, unstable + Schema-based).
- Copy from OM/Medusa: module folders, no cross-module ORM relations, closed error taxonomy, after-commit events, feature ACL. Skip: CRUD generators, workflow DSL, codegen, query joiner, decorators.

## Files changed

- `.ai/specs/2026-10-19-engineering-standards.md` (new, draft)
- `.ai/runs/2026-10-19-tech-stack-standards-spec.md` (this log)

## Verification

- Documentation only; no code changed, so lint/typecheck/build not run.

## Open issues / next steps

- User reviews D1–D9. After approval: update AGENTS.md and implement section 13 of the spec.

## Review round 1 (user feedback)

- User approved D1–D9 as recommended, with one change: **agent-browser instead of Playwright** for e2e (D6). Also: keep the solution simple, with no unrequested complexity.
- Checked agent-browser: `agent-browser@0.39.1` (vercel-labs), a Rust CLI with `--json`, `batch`, sessions and refs. It has no test-runner integration, so e2e tests drive the CLI from Vitest through a small `execFile` helper.
- Spec updated: status approved, new section 1a "keep it simple", D6/stack/testing switched to agent-browser. Speculative items moved to "when needed": repositories and use-case files for simple modules, events/PubSub, optimistic locking, soft delete, OpenAPI, react-hook-form, OpenTelemetry. `eslint-plugin-boundaries` dropped in favour of the built-in `no-restricted-imports`. Money convention removed.
- Lessons recorded: `use-agent-browser-for-e2e`, `keep-solutions-simple`.
- Next: implement spec section 13 when the user asks.
