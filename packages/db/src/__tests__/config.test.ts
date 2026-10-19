import { afterEach, describe, expect, it, vi } from "vitest";

import { createOrmConfig } from "../config";
import { entities } from "../entities";

const DATABASE_URL = "postgres://user:pass@localhost:5432/devmentor";

describe("createOrmConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("builds the options from the environment", () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("DB_POOL_MIN", "2");
    vi.stubEnv("DB_POOL_MAX", "5");
    vi.stubEnv("DB_DEBUG", "true");
    expect(createOrmConfig()).toMatchObject({
      clientUrl: DATABASE_URL,
      entities,
      pool: { min: 2, max: 5 },
      debug: true,
    });
  });

  it("applies overrides", () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    expect(createOrmConfig({ debug: true, pool: { min: 0, max: 1 } })).toMatchObject({
      debug: true,
      pool: { min: 0, max: 1 },
    });
  });

  it("fails on an invalid environment", () => {
    vi.stubEnv("DATABASE_URL", "mysql://localhost/devmentor");
    expect(() => createOrmConfig()).toThrow(/DATABASE_URL/);
  });
});
