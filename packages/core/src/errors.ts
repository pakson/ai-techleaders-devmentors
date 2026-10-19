import { Data } from "effect";

/**
 * Closed error taxonomy. Expected failures travel in the Effect error channel as one of these
 * tagged errors; `errorToResponse` / `toApiError` map each tag to one HTTP status and wire code.
 * Module-specific errors are added only when a caller needs to branch on them.
 */

/** Field-level issues in the shape of `z.flattenError`. */
export interface ValidationIssues {
  readonly formErrors: ReadonlyArray<string>;
  readonly fieldErrors: Readonly<Record<string, ReadonlyArray<string> | undefined>>;
}

/** Input failed Zod decoding (400). */
export class ValidationError extends Data.TaggedError("ValidationError")<{
  readonly message: string;
  readonly issues: ValidationIssues;
}> {}

/** The caller is not signed in (401). */
export class Unauthorized extends Data.TaggedError("Unauthorized")<{
  readonly message?: string;
}> {}

/** The caller lacks an ACL feature (403). */
export class Forbidden extends Data.TaggedError("Forbidden")<{
  readonly feature?: string;
  readonly message?: string;
}> {}

/** A resource doesn't exist (404). */
export class NotFound extends Data.TaggedError("NotFound")<{
  readonly resource: string;
  readonly id?: string;
}> {}

/** Unique violation, optimistic lock or invalid state transition (409). */
export class Conflict extends Data.TaggedError("Conflict")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** A domain rule rejected the request (422). `code` is a stable, machine-readable string. */
export class BusinessRuleViolation extends Data.TaggedError("BusinessRuleViolation")<{
  readonly code: string;
  readonly message: string;
}> {}

/** Unexpected database failure (500). The cause is logged, never sent to clients. */
export class DbError extends Data.TaggedError("DbError")<{
  readonly cause: unknown;
}> {}

/** Required configuration (usually an environment variable) is missing or invalid. */
export class ConfigError extends Data.TaggedError("ConfigError")<{
  readonly message: string;
}> {}

export type AppError =
  | ValidationError
  | Unauthorized
  | Forbidden
  | NotFound
  | Conflict
  | BusinessRuleViolation
  | DbError
  | ConfigError;
