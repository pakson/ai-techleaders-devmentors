import { parseEnv } from "@devmentor/core/config";
import { defineConfig, type Options } from "@mikro-orm/postgresql";
import { Redacted } from "effect";

import { entities } from "./entities";

/**
 * Builds the MikroORM options shared by the Next.js runtime and the MikroORM CLI
 * (the CLI adds the migrations settings in `mikro-orm.config.ts`).
 *
 * Environment (parsed by `parseEnv`):
 * - `DATABASE_URL` (required): postgres://user:pass@host:5432/db
 * - `DB_POOL_MIN` / `DB_POOL_MAX`: connection pool bounds (default 0 / 10)
 * - `DB_DEBUG`: log SQL queries (default false)
 */
export function createOrmConfig(overrides: Partial<Options> = {}): Options {
  const config = parseEnv();
  return defineConfig({
    clientUrl: Redacted.value(config.databaseUrl),
    entities,
    pool: { min: config.dbPoolMin, max: config.dbPoolMax },
    debug: config.dbDebug,
    ...overrides,
  });
}
