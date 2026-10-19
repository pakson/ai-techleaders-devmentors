import { DbError } from "@devmentor/core/errors";
import { Cause, Effect, Exit, Option } from "effect";
import { describe, expect, it, vi } from "vitest";

import { RequestContext } from "../request-context";
import { runRequest } from "../run-request";

const createRequestScope = vi.fn();
vi.mock("@/di/container", () => ({ createRequestScope: () => createRequestScope() }));

describe("runRequest", () => {
  it("provides a generated request id when none is given", async () => {
    createRequestScope.mockResolvedValue({ cradle: { em: {} } });
    const exit = await runRequest(RequestContext.use((context) => Effect.succeed(context)));
    expect(Exit.isSuccess(exit) && exit.value.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("fails with DbError when the request scope can't be created", async () => {
    const cause = new Error("ECONNREFUSED");
    createRequestScope.mockRejectedValue(cause);
    const exit = await runRequest(Effect.succeed("unreachable"));
    expect(Exit.isFailure(exit)).toBe(true);
    if (Exit.isFailure(exit)) {
      expect(Cause.findErrorOption(exit.cause)).toEqual(Option.some(new DbError({ cause })));
    }
  });
});
