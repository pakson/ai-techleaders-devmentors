import { MikroORM } from "@mikro-orm/postgresql";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { closeOrm, getOrm } from "../orm";

describe("getOrm / closeOrm", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost:5432/devmentor");
  });

  afterEach(async () => {
    await closeOrm();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("initializes the ORM once, lazily, and reuses it", async () => {
    const orm = { close: vi.fn(async () => undefined) } as unknown as MikroORM;
    const init = vi.spyOn(MikroORM, "init").mockResolvedValue(orm);
    expect(init).not.toHaveBeenCalled();
    expect(await getOrm()).toBe(orm);
    expect(await getOrm()).toBe(orm);
    expect(init).toHaveBeenCalledTimes(1);
    expect(init.mock.calls[0]?.[0]).toMatchObject({
      clientUrl: "postgres://user:pass@localhost:5432/devmentor",
    });
  });

  it("retries after a failed initialization", async () => {
    const orm = { close: vi.fn(async () => undefined) } as unknown as MikroORM;
    vi.spyOn(MikroORM, "init")
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(orm);
    await expect(getOrm()).rejects.toThrow("ECONNREFUSED");
    expect(await getOrm()).toBe(orm);
  });

  it("closes the pool and creates a new ORM on the next call", async () => {
    const first = { close: vi.fn(async () => undefined) } as unknown as MikroORM;
    const second = { close: vi.fn(async () => undefined) } as unknown as MikroORM;
    vi.spyOn(MikroORM, "init").mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    await getOrm();
    await closeOrm();
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(await getOrm()).toBe(second);
  });

  it("does nothing when no ORM was created", async () => {
    await expect(closeOrm()).resolves.toBeUndefined();
  });
});
