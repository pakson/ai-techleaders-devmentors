import { ConfigError } from "../errors";

type Env = Record<string, string | undefined>;

/** Reads a required string variable. Throws `ConfigError` when it's missing or empty. */
export function requireEnv(name: string, env: Env = process.env): string {
  const value = env[name];
  if (value === undefined || value === "") {
    throw new ConfigError(`Missing required environment variable ${name}`);
  }
  return value;
}

/** Reads an optional string variable and returns `fallback` when it's unset or empty. */
export function readEnv(name: string, fallback: string, env?: Env): string;
export function readEnv(name: string, fallback?: undefined, env?: Env): string | undefined;
export function readEnv(name: string, fallback?: string, env: Env = process.env): string | undefined {
  const value = env[name];
  return value === undefined || value === "" ? fallback : value;
}

/** Reads an optional integer variable. Throws `ConfigError` when the value isn't an integer. */
export function readEnvInt(name: string, fallback: number, env: Env = process.env): number {
  const raw = readEnv(name, undefined, env);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new ConfigError(`Environment variable ${name} must be an integer, got "${raw}"`);
  }
  return value;
}

/** Reads an optional boolean variable (`true`/`1`/`yes` mean true). */
export function readEnvBool(name: string, fallback: boolean, env: Env = process.env): boolean {
  const raw = readEnv(name, undefined, env);
  if (raw === undefined) return fallback;
  return ["true", "1", "yes"].includes(raw.toLowerCase());
}
