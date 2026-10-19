# Sandbox DATABASE_URL overrides .env files and points at a shared database

- Date: 2026-10-19
- Context: monorepo setup, first MikroORM migration run

## Finding
The sandbox exports `DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/open-mercato`, and a Postgres server already listens on 127.0.0.1:5432. Real environment variables take precedence over `packages/app/.env*` (in Next.js and in the MikroORM CLI, which uses `@next/env`). So `npm run db:migration:up` ran against `open-mercato`, not the intended local database. The initial migration (`users`, `mikro_orm_migrations`) is still applied there. Rolling it back was not permitted, so it's left for the user.

## Resolution
For throwaway tests, start a separate cluster on another port (e.g. `initdb -D /tmp/pgdata`, `pg_ctl ... -o "-p 5433"`) and pass `DATABASE_URL=...:5433/...` explicitly in the command.

## Rule going forward
Before any command that writes to a database (migrations, seeds, schema tools), run `echo $DATABASE_URL` and confirm the target. Never assume `.env.local` wins over the process environment. Ask the user before writing to a database you didn't create.
