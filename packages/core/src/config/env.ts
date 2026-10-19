import { Redacted } from "effect";
import { z } from "zod";

import { ConfigError } from "../errors";

type Env = Record<string, string | undefined>;

const Bool = z.string().transform((value) => ["true", "1", "yes"].includes(value.toLowerCase()));

const EnvSchema = z.object({
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
  DB_DEBUG: Bool.default(false),
});

export interface Config {
  /** postgres://user:pass@host:5432/db. Redacted, because it contains the password. */
  readonly databaseUrl: Redacted.Redacted<string>;
  readonly dbPoolMin: number;
  readonly dbPoolMax: number;
  readonly dbDebug: boolean;
}

/**
 * Parses the environment with Zod. Empty values count as unset. Throws `ConfigError` listing
 * every invalid variable.
 */
export function parseEnv(env: Env = process.env): Config {
  const present = Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));
  const result = EnvSchema.safeParse(present);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new ConfigError({ message: `Invalid environment: ${problems.join("; ")}` });
  }
  const data = result.data;
  return {
    databaseUrl: Redacted.make(data.DATABASE_URL),
    dbPoolMin: data.DB_POOL_MIN,
    dbPoolMax: data.DB_POOL_MAX,
    dbDebug: data.DB_DEBUG,
  };
}
