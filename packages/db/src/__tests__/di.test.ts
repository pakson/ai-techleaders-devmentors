import { createAppContainer } from "@devmentor/core/di";
import type { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import { registerDb, type DbCradle } from "../di";

describe("registerDb", () => {
  it("registers the ORM and a fresh em fork per scope", () => {
    let forks = 0;
    const orm = { em: { fork: () => ({ fork: ++forks }) } } as unknown as MikroORM;
    const container = createAppContainer<DbCradle>([registerDb(orm)]);
    expect(container.resolve("orm")).toBe(orm);

    const scope = container.createScope();
    expect(scope.resolve("em")).toBe(scope.resolve("em"));
    expect(container.createScope().resolve("em")).not.toBe(scope.resolve("em"));
    expect(forks).toBe(2);
  });
});
