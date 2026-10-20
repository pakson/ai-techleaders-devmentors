# Idempotent DevMentor installer

## 📝 TLDR

Developers currently have to execute the DevMentor setup commands from the README one by one. This feature adds a root `npm run setup` command that installs workspace dependencies, preserves or creates local environment configuration, starts or reuses the documented PostgreSQL service, waits until the selected database is reachable, and applies only pending MikroORM migrations. The command exits after provisioning and tells the developer to run `npm run dev`; it never owns a foreground application server.

## 📝 Problem Statement

A fresh checkout has no single, repeatable entry point for local setup. Manual steps are easy to run out of order, and a partially completed setup gives no reliable recovery path. Re-running the current instructions can also encourage overwriting `packages/app/.env.local`, restarting an already-running database, or treating migrations as a one-time setup action even when new migrations have been added.

The affected user is a developer setting up or recovering a local checkout. The repository already defines the intended commands, PostgreSQL Compose service, environment example, and MikroORM migration ledger; the installer should orchestrate those existing contracts.

## 📝 Proposed Solution

Add an additive root `setup` npm script backed by a dependency-free TypeScript CLI entry point. The CLI delegates application behavior to the existing `npm install`, Docker Compose, and `npm run db:migration:up` commands instead of duplicating package or migration logic.

The installer detects actual state on every run:

- It bootstraps workspace dependencies before loading any workspace package.
- It creates `packages/app/.env.local` only when it is absent, copying the example without replacing an existing file.
- It starts the local Compose PostgreSQL service when the selected target is the documented local database, and reuses it when it is already running.
- It waits for database readiness before invoking the migration command.
- It relies on MikroORM's migration ledger so an already-migrated database is a no-op and a database with new migrations receives only those migrations.
- It reports a resumable failure and stops dependent steps on the first failed prerequisite.
- It exits with a successful handoff message rather than starting `npm run dev`.

When an existing `DATABASE_URL` selects a server outside the documented local Compose target, setup requires explicit confirmation in an interactive terminal or an explicit opt-in environment variable. It never destroys volumes, resets data, prints credentials, or silently migrates an external database.

Common bootstrap tools such as framework starters and ORM CLIs separate provisioning from running the application and make repeat execution safe through state checks. This proposal applies the smallest version of that pattern to this repository: one command, existing infrastructure, and no new runtime dependency or application feature.

## Resolved assumptions (autonomous defaults)

- **Lifecycle:** setup provisions dependencies, configuration, database, and migrations, then exits with `npm run dev` as the next command. This has the smallest operational footprint and avoids duplicate foreground servers on repeat runs.
- **Existing database target:** an interactive confirmation is required for a non-default or external `DATABASE_URL`; non-interactive use must provide an explicit opt-in variable. This protects external data while keeping CI and scripted setup deterministic.
- **Dependency bootstrap:** the root entry point uses only Node.js built-ins and Node 22.17's TypeScript stripping, so `npm run setup` can invoke `npm install` before workspace dependencies exist. No new package is introduced.
- **Readiness strategy:** the installer polls the selected PostgreSQL endpoint with a bounded timeout before migrations and prints remediation without exposing the URL. It does not add a second database client library.
- **Migration failures:** setup stops immediately and returns nonzero; a later run invokes the same migration command and lets MikroORM determine pending work. The installer does not maintain a second completion marker.

## 📝 Architecture

The new root command is a thin CLI boundary in `scripts/setup.ts). Its dependency-free orchestration and state model live in `packages/core/src/setup/installer.ts), which exposes testable functions and accepts filesystem, environment, process, clock, and readiness seams. The module has no React, Next.js, MikroORM, or Effect dependency.

The runtime flow is:

```mermaid
flowchart TD
  A[Existing: npm run setup] --> B[New: installer orchestration]
  B --> C[Existing: npm install]
  B --> D[Existing: copy .env.example if .env.local absent]
  B --> E{Target is default local DB?}
  E -- yes --> F[Existing: docker compose up -d postgres]
  E -- no --> G[Explicit confirmation or opt-in]
  F --> H[New: bounded PostgreSQL readiness poll]
  G --> H
  H --> I[Existing: npm run db:migration:up]
  I --> J[New: report next command: npm run dev]
```

The CLI owns ordering, state checks, redacted user-facing messages, and exit status. Existing commands own dependency installation, container lifecycle, and migration semantics. The application server is outside this flow.

## 📝 Data Model

No application entity, database table, or migration is added. The installer reads and writes only the developer's local `packages/app/.env.local` file when that file does not exist, and it starts or reuses the existing Compose volume. Migration completion remains owned by the existing `mikro_orm_migrations` ledger.

## 📝 API Contracts

### Root command

- `npm run setup` runs `node --experimental-strip-types scripts/setup.ts`.
- Exit code `0`: dependencies, environment, selected database, and all currently pending migrations are ready; the output includes the explicit next command.
- Exit code nonzero: a prerequisite failed or a required confirmation was not supplied. Dependent work is skipped and output includes the failed step and a remediation.
- Existing process environment variables take precedence over env files, matching the repository configuration contract.
- Credentials and full database URLs are never printed.

### Configuration and confirmation

- Missing `packages/app/.env.local`: copy `packages/app/.env.example` and report that it was created.
- Existing `.env.local`: preserve byte-for-byte and report that it was reused.
- Default local target: the documented Compose database from the example, or an equivalent loopback target selected explicitly by the developer.
- External target: require an interactive yes/no confirmation or an explicit setup opt-in variable whose value is documented in the README. Declining or missing confirmation exits before any migration command.
- Readiness timeout and polling interval are constants with tests; no user-facing secret is included in timeout errors.

## 📝 UI/UX

There is no application UI change. The terminal experience is the user-facing surface:

- Each step reports whether it ran, was skipped because actual state was already complete, or failed.
- Repeat runs must clearly show reuse of dependencies, environment, database, and migration state.
- Failures name the failed operation, explain what to correct, and identify the next safe rerun.
- Success ends with the exact handoff `npm run dev`.
- Output works in a non-color terminal and does not rely on interactive prompts when explicit opt-in variables are provided.

## 📝 Edge Cases & Failure Scenarios

- Node.js below the documented minimum: stop before mutating project state with an actionable version message.
- `npm install` fails: do not start Docker or migrate; return its nonzero status.
- The example env file or parent directory is missing: stop and identify the repository path.
- `.env.local` is present but invalid: preserve it and let the existing migration/config command report the configuration problem without exposing values.
- Docker is unavailable, Compose fails, or PostgreSQL never becomes ready: stop before migration and explain the required service/action.
- An external database is selected without confirmation: stop before connecting for migration.
- A migration fails: preserve all local state, return nonzero, and permit a later run to retry pending migrations.
- A new migration is added after a successful run: the next run does not trust a marker; it waits for the database and invokes the existing migration ledger.
- Ctrl-C or another interruption: return nonzero and leave files, containers, volumes, and migration state intact.
- A foreground `npm run dev` is already running: setup never starts a second one.

## 📝 Risks & Impact Review

The command gains permission to start the repository's local Compose service and to invoke migrations, so an incorrect target could affect developer data. The explicit external-target confirmation, environment precedence, redacted output, and no-reset policy limit that risk. The implementation changes no HTTP, package export, schema, or runtime configuration contract; it adds one root script and one CLI-only module.

The installer should be rollback-safe by deletion of the additive script and entry point. It must not remove `.env.local`, stop or recreate containers, delete volumes, or edit applied migrations. Testing uses a task-owned disposable PostgreSQL database; the shared development database is never used by tests.

## 📋 Phasing

- **Phase 1 — Installer walking skeleton:** add the dependency-free CLI boundary, step orchestration, environment preservation, and actionable failure propagation.
- **Phase 2 — Database safety:** add local Compose reuse, external-target confirmation, bounded readiness polling, and migration delegation.
- **Phase 3 — Documentation and verification:** update README, cover fresh/repeat/recovery/failure paths, and prove migrations preserve rows and apply once on a disposable database.

## 📋 Implementation Plan

### Phase 1: Bootstrap and orchestration

1. Add the root `setup` npm script and `scripts/setup.ts`, using only Node built-ins so it can run before workspace dependencies are installed.
2. Add the installer orchestration module with injected filesystem/process/environment seams, step results, nonzero failure propagation, Node version validation, and redacted output.
3. Add unit tests for fresh setup, repeat setup, partial setup, interrupted/failed commands, missing prerequisites, and preserved environment contents.

### Phase 2: Database setup

4. Implement environment-target resolution and explicit confirmation for external databases without changing process-variable precedence.
5. Implement Compose start/reuse and bounded PostgreSQL readiness polling without printing credentials or destructive commands.
6. Delegate migrations to the existing root migration script and add tests proving the migration step is skipped only when the existing ledger says there is no pending work, while later migrations remain discoverable.

### Phase 3: Documentation and integration proof

7. Update README prerequisites, automated setup, repeat/recovery behavior, external-database confirmation, app handoff, manual alternative, and scripts table.
8. Add a disposable-database integration smoke test that runs setup twice, inserts a row between runs, and proves the row survives while the migration ledger does not reapply completed migrations.
9. Run the repository validation gate and applicable integration/E2E checks; record evidence in the run log and PR summary.

## 🧪 Review limits

This autonomous design uses the repository's current README, Compose file, environment example, MikroORM CLI config, package scripts, compatibility contract, and test configuration. It does not assume a production deployment workflow or a new product surface. The implementation must validate the exact Node 22.17 TypeScript entry-point behavior in CI and keep the integration smoke test isolated from any developer database.
