import { Cause } from "effect";
import { describe, expect, it } from "vitest";

import {
  BusinessRuleViolation,
  Conflict,
  DbError,
  Forbidden,
  NotFound,
  Unauthorized,
  ValidationError,
} from "../errors";
import { errorToResponse, isUnexpected, mapCause, toApiError } from "../http";

describe("toApiError", () => {
  it.each([
    [
      new ValidationError({
        message: "Invalid input",
        issues: { formErrors: [], fieldErrors: {} },
      }),
      400,
      "validation_error",
    ],
    [new Unauthorized({}), 401, "unauthorized"],
    [new Forbidden({ feature: "mentoring.sessions.manage" }), 403, "forbidden"],
    [new NotFound({ resource: "session", id: "1" }), 404, "not_found"],
    [new Conflict({ message: "Already booked" }), 409, "conflict"],
    [
      new BusinessRuleViolation({ code: "session_full", message: "Session is full" }),
      422,
      "session_full",
    ],
    [new DbError({ cause: new Error("connection refused") }), 500, "internal_error"],
  ])("maps %s", (error, status, code) => {
    const mapped = toApiError(error);
    expect(mapped.status).toBe(status);
    expect(mapped.error.code).toBe(code);
  });

  it("uses default messages", () => {
    expect(toApiError(new Unauthorized({})).error.message).toBe("Sign in required");
    expect(toApiError(new NotFound({ resource: "session" })).error.message).toBe(
      "session not found",
    );
  });

  it("hides the cause of 5xx errors", () => {
    const mapped = toApiError(new DbError({ cause: new Error("password authentication failed") }));
    expect(JSON.stringify(mapped)).not.toContain("password");
  });
});

describe("mapCause / errorToResponse", () => {
  it("maps defects to a generic 500", async () => {
    const cause = Cause.die(new Error("secret stack"));
    expect(mapCause(cause).status).toBe(500);
    expect(isUnexpected(cause)).toBe(true);
    const response = errorToResponse(cause);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: { code: "internal_error", message: "Internal server error" },
    });
  });

  it("treats expected failures as not unexpected", () => {
    expect(isUnexpected(Cause.fail(new NotFound({ resource: "session" })))).toBe(false);
    expect(isUnexpected(Cause.fail(new DbError({ cause: null })))).toBe(true);
  });

  it("maps an interruption to 503 without logging it", () => {
    const cause = Cause.interrupt();
    expect(mapCause(cause)).toEqual({
      status: 503,
      error: { code: "interrupted", message: "Request was cancelled" },
    });
    expect(isUnexpected(cause)).toBe(false);
  });
});
