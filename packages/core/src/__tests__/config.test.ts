import { Redacted } from "effect";
import { describe, expect, it } from "vitest";

import { parseEnv } from "../config";
import { ConfigError } from "../errors";

const DATABASE_URL = "postgres://user:secret@localhost:5432/devmentor";

describe("parseEnv", () => {
  it("applies defaults", () => {
    const config = parseEnv({ DATABASE_URL });
    expect(Redacted.value(config.databaseUrl)).toBe(DATABASE_URL);
    expect(config).toMatchObject({ dbPoolMin: 0, dbPoolMax: 10, dbDebug: false });
  });

  it("parses numbers and booleans, treating empty values as unset", () => {
    const config = parseEnv({ DATABASE_URL, DB_POOL_MAX: "5", DB_DEBUG: "yes", DB_POOL_MIN: "" });
    expect(config).toMatchObject({ dbPoolMin: 0, dbPoolMax: 5, dbDebug: true });
  });

  it("keeps the database URL out of logs", () => {
    expect(String(parseEnv({ DATABASE_URL }).databaseUrl)).not.toContain("secret");
  });

  it("throws ConfigError naming every invalid variable", () => {
    expect(() => parseEnv({ DB_POOL_MAX: "many" })).toThrow(ConfigError);
    expect(() => parseEnv({ DB_POOL_MAX: "many" })).toThrow(/DATABASE_URL.*DB_POOL_MAX/);
    expect(() => parseEnv({ DATABASE_URL: "mysql://localhost/db" })).toThrow(ConfigError);
  });
});
