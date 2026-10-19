import type { MikroORM } from "@devmentor/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getOrm = vi.fn<() => Promise<MikroORM>>();
vi.mock("@devmentor/db", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@devmentor/db")>()),
  getOrm: () => getOrm(),
}));

const { createRequestScope, getContainer } = await import("../container");

const globalForContainer = globalThis as { __devmentorContainer?: unknown };
let forks = 0;
const orm = { em: { fork: () => ({ fork: ++forks }) } } as unknown as MikroORM;

describe("app container", () => {
  beforeEach(() => {
    getOrm.mockReset();
  });

  afterEach(() => {
    globalForContainer.__devmentorContainer = undefined;
  });

  it("creates one container per process, kept on globalThis", async () => {
    getOrm.mockResolvedValue(orm);
    const container = await getContainer();
    expect(await getContainer()).toBe(container);
    expect(globalForContainer.__devmentorContainer).toBeDefined();
    expect(container.resolve("orm")).toBe(orm);
    expect(getOrm).toHaveBeenCalledTimes(1);
  });

  it("gives every request scope its own em fork", async () => {
    getOrm.mockResolvedValue(orm);
    const first = await createRequestScope();
    const second = await createRequestScope();
    expect(first.cradle.em).not.toBe(second.cradle.em);
  });

  it("retries when the ORM fails to initialize", async () => {
    getOrm.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValueOnce(orm);
    await expect(getContainer()).rejects.toThrow("ECONNREFUSED");
    expect((await getContainer()).resolve("orm")).toBe(orm);
  });
});
