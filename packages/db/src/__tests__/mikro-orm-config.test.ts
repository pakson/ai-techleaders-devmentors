import { Migrator } from "@mikro-orm/migrations";
import { describe, expect, it, vi } from "vitest";

describe("MikroORM CLI config", () => {
  it("adds the migrator and the migrations settings", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/devmentor");
    const { default: config } = await import("../mikro-orm.config");
    vi.unstubAllEnvs();
    expect(config.clientUrl).toBe("postgres://user:pass@localhost:5432/devmentor");
    expect(config.extensions).toEqual([Migrator]);
    expect(config.migrations).toMatchObject({
      tableName: "mikro_orm_migrations",
      transactional: true,
      emit: "ts",
      snapshotName: ".snapshot",
    });
    expect(config.migrations?.path).toMatch(/packages\/db\/src\/migrations$/);
  });
});
