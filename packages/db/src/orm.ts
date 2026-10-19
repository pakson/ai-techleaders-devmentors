import { MikroORM } from "@mikro-orm/postgresql";

import { createOrmConfig } from "./config";

// One MikroORM instance (and so one connection pool) per process. It's kept on globalThis so
// Next.js dev-mode HMR reuses it instead of opening a new pool on every reload.
const globalForOrm = globalThis as typeof globalThis & {
  __devmentorOrm?: Promise<MikroORM>;
};

/**
 * Returns the process-wide ORM. Created lazily on first call, never at import time, so
 * `next build` and other tooling can import this package without a database.
 */
export function getOrm(): Promise<MikroORM> {
  globalForOrm.__devmentorOrm ??= MikroORM.init(createOrmConfig()).catch((error: unknown) => {
    // Allow a retry on the next call instead of caching the failure forever.
    globalForOrm.__devmentorOrm = undefined;
    throw error;
  });
  return globalForOrm.__devmentorOrm;
}

/** Closes the pool (for scripts, tests and graceful shutdown). */
export async function closeOrm(): Promise<void> {
  const orm = globalForOrm.__devmentorOrm;
  globalForOrm.__devmentorOrm = undefined;
  if (orm) await (await orm).close();
}
