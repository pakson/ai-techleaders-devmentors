import { Cause } from "effect";

import type { AppError, ValidationIssues } from "./errors";

/** Error payload sent to clients: `{ "error": ApiError }` for routes, `ActionResult` for actions. */
export interface ApiError {
  readonly code: string;
  readonly message: string;
  readonly details?: unknown;
}

export interface MappedError {
  readonly status: number;
  readonly error: ApiError;
  /** Field errors of a `ValidationError`, for forms. */
  readonly issues?: ValidationIssues;
}

const INTERNAL: MappedError = {
  status: 500,
  error: { code: "internal_error", message: "Internal server error" },
};

/** Maps one tagged error to its HTTP status and client-safe payload. */
export function toApiError(error: AppError): MappedError {
  switch (error._tag) {
    case "ValidationError":
      return {
        status: 400,
        error: { code: "validation_error", message: error.message, details: error.issues },
        issues: error.issues,
      };
    case "Unauthorized":
      return {
        status: 401,
        error: { code: "unauthorized", message: error.message || "Sign in required" },
      };
    case "Forbidden":
      return { status: 403, error: { code: "forbidden", message: error.message || "Forbidden" } };
    case "NotFound":
      return {
        status: 404,
        error: { code: "not_found", message: `${error.resource} not found` },
      };
    case "Conflict":
      return { status: 409, error: { code: "conflict", message: error.message } };
    case "BusinessRuleViolation":
      return { status: 422, error: { code: error.code, message: error.message } };
    case "DbError":
    case "ConfigError":
      return INTERNAL;
  }
}

/** True when the cause needs a server-side log entry (defects and 5xx errors). */
export function isUnexpected(cause: Cause.Cause<AppError>): boolean {
  if (Cause.hasInterruptsOnly(cause)) return false;
  const error = Cause.findErrorOption(cause);
  return error._tag === "None" || toApiError(error.value).status >= 500;
}

/** Maps a failure cause to a status and payload. Defects and 5xx errors get a generic message. */
export function mapCause(cause: Cause.Cause<AppError>): MappedError {
  const error = Cause.findErrorOption(cause);
  if (error._tag === "Some") return toApiError(error.value);
  if (Cause.hasInterruptsOnly(cause)) {
    return { status: 503, error: { code: "interrupted", message: "Request was cancelled" } };
  }
  return INTERNAL;
}

/** Builds the JSON error `Response` (Web API, no Next.js dependency). */
export function errorToResponse(cause: Cause.Cause<AppError>): Response {
  const { status, error } = mapCause(cause);
  return Response.json({ error }, { status });
}
