import { describe, expect, it, vi } from "vitest";

import { GET } from "../api/health/route";

const execute = vi.fn();
vi.mock("@/di/container", () => ({
  createRequestScope: async () => ({ cradle: { em: { execute } } }),
}));

const context = { params: Promise.resolve({}) };

describe("GET /api/health", () => {
  it("returns ok when the database answers", async () => {
    execute.mockResolvedValue([{ "?column?": 1 }]);
    const response = await GET(new Request("http://test/api/health"), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("returns the generic 500 body when the database is down", async () => {
    execute.mockRejectedValue(new Error("password authentication failed for user devmentor"));
    const response = await GET(new Request("http://test/api/health"), context);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "internal_error", message: "Internal server error" },
    });
  });
});
