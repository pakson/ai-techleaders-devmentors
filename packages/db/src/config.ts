import { readEnvBool, readEnvInt, requireEnv } from "@devmentor/core";
import { defineConfig, type Options } from "@mikro-orm/postgresql";

import { entities } from "./entities";

/**
 * Builds the MikroORM options shared by the Next.js runtime and the MikroORM CLI
 * (the CLI adds the migrations settings in `mikro-orm.config.ts`).
 *
 * Environment:
 * - `DATABASE_URL` (required): postgres://user:pass@host:5432/db
 * - `DB_POOL_MIN` / `DB_POOL_MAX`: connection pool bounds (default 0 / 10)
 * - `DB_DEBUG`: log SQL queries (default false)
 */
export function createOrmConfig(overrides: Partial<Options> = {}): Options {
  return defineConfig({
    clientUrl: requireEnv("DATABASE_URL"),
    entities,
    pool: {
      min: readEnvInt("DB_POOL_MIN", 0),
      max: readEnvInt("DB_POOL_MAX", 10),
    },
    debug: readEnvBool("DB_DEBUG", false),
    ...overrides,
  });
}
