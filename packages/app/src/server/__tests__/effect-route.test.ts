import { DbError, NotFound } from "@devmentor/core/errors";
import { Effect } from "effect";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { effectAction } from "../effect-action";
import { effectRoute } from "../effect-route";
import { RequestContext } from "../request-context";

// No database: every request scope gets a stub EntityManager.
vi.mock("@/di/container", () => ({
  createRequestScope: async () => ({ cradle: { em: {} } }),
}));

const Dto = z.object({ id: z.string(), name: z.string() });
const params = (value: Record<string, string>) => ({ params: Promise.resolve(value) });

const getUser = effectRoute(
  {
    params: z.object({ id: z.string().min(2) }),
    query: z.object({ q: z.string().optional() }),
    response: Dto,
  },
  Effect.fn(function* ({ params, query }) {
    if (params.id === "missing") return yield* new NotFound({ resource: "user", id: params.id });
    if (params.id === "broken") {
      return yield* new DbError({ cause: new Error("password authentication failed") });
    }
    return { id: params.id, name: query.q ?? "Ada", password: "hunter2" };
  }),
);

describe("effectRoute", () => {
  it("encodes the output through the response schema", async () => {
    const response = await getUser(
      new Request("http://test/api/users/42?q=Lin"),
      params({ id: "42" }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id: "42", name: "Lin" });
  });

  it("returns 400 with field errors for invalid params", async () => {
    const response = await getUser(new Request("http://test/api/users/x"), params({ id: "x" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("validation_error");
    expect(body.error.details.fieldErrors.id).toBeDefined();
  });

  it("maps tagged errors to their status", async () => {
    const response = await getUser(
      new Request("http://test/api/users/missing"),
      params({ id: "missing" }),
    );
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "user not found" },
    });
  });

  it("hides 5xx details", async () => {
    const response = await getUser(
      new Request("http://test/api/users/broken"),
      params({ id: "broken" }),
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("password");
  });

  it("decodes a JSON body, rejects malformed JSON and uses the configured status", async () => {
    const create = effectRoute(
      { body: z.object({ name: z.string() }), response: Dto, status: 201 },
      ({ body }) => Effect.succeed({ id: "1", name: body.name }),
    );
    const post = (body: string) => new Request("http://test/api/users", { method: "POST", body });
    const created = await create(post(JSON.stringify({ name: "Ada" })), params({}));
    expect(created.status).toBe(201);
    expect((await create(post("{not json"), params({}))).status).toBe(400);
  });

  it("provides the request id from x-request-id", async () => {
    const route = effectRoute({ response: z.object({ requestId: z.string() }) }, () =>
      RequestContext.use((context) => Effect.succeed({ requestId: context.requestId })),
    );
    const request = new Request("http://test/api/echo", { headers: { "x-request-id": "req-1" } });
    expect(await (await route(request, params({}))).json()).toEqual({ requestId: "req-1" });
  });
});

describe("effectAction", () => {
  const rename = effectAction(
    { input: z.object({ name: z.string().min(1) }), output: Dto },
    ({ name }) => Effect.succeed({ id: "1", name, password: "hunter2" }),
  );

  it("returns ok with encoded data", async () => {
    expect(await rename({ name: "Ada" })).toEqual({ ok: true, data: { id: "1", name: "Ada" } });
  });

  it("returns field errors for invalid input", async () => {
    const result = await rename({ name: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("validation_error");
      expect(result.error.fieldErrors?.["name"]).toBeDefined();
    }
  });
});
