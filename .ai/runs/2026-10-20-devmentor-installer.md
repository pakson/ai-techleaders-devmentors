# DevMentor installer implementation

- Date: 2026-10-20
- Goal: implement issue #5 as an idempotent root `npm run setup` command that safely provisions dependencies, local configuration, PostgreSQL readiness, and pending migrations.
- Scope: root setup entry point, framework-agnostic installer orchestration, focused unit/integration coverage, and README documentation.
- Non-goals: application features, production deployment, database reset/reseed, system-level tool installation, CI/ruleset changes, and starting a foreground dev server.
- Source doc: .ai/specs/2026-10-20-devmentor-installer.md

## Risks

- A setup command can affect developer data if it silently migrates an external database; resolve the target and require explicit opt-in outside the documented local Compose target.
- The entry point must run before workspace dependencies exist; keep its imports to Node built-ins and validate Node 22.17 behavior.
- Database readiness and migration tests must use a task-owned disposable database and never the shell's shared `DATABASE_URL`.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Bootstrap and orchestration

- [x] 1.1 Add the root setup entry point and installer orchestration seams — 28849c9
- [x] 1.2 Add unit coverage for fresh, repeat, partial, and failure paths — 28849c9

### Phase 2: Database safety

- [x] 2.1 Resolve targets and protect external databases with explicit confirmation — 28849c9
- [x] 2.2 Start/reuse PostgreSQL and poll readiness with bounded, redacted errors — 28849c9
- [x] 2.3 Delegate pending migrations and cover disposable database preservation — 28849c9

### Phase 3: Documentation and verification

- [x] 3.1 Update README automated/manual setup guidance and scripts — 28849c9
- [x] 3.2 Run the full validation and applicable integration/E2E checks — local gate passed; `test:int` awaits a container runtime
- [ ] 3.3 Run review/autofix, publish evidence, and complete the implementation PR
