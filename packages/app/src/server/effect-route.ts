import "server-only";

import { errorToResponse } from "@devmentor/core/http";
import { ValidationError, type AppError } from "@devmentor/core/errors";
import { decode, encode } from "@devmentor/core/validation";
import { Effect, Exit } from "effect";
import type { z } from "zod";

import { runRequest, type RequestServices } from "./run-request";

type Output<S> = S extends z.ZodType ? z.output<S> : undefined;

export interface RouteSchemas<
  P extends z.ZodType | undefined,
  Q extends z.ZodType | undefined,
  B extends z.ZodType | undefined,
  R extends z.ZodType,
> {
  readonly params?: P;
  readonly query?: Q;
  readonly body?: B;
  /** Output is encoded through it, so undeclared fields never leave the server. */
  readonly response: R;
  /** Success status (default 200; use 201 for creates). */
  readonly status?: number;
}

export interface RouteInput<P, Q, B> {
  readonly params: Output<P>;
  readonly query: Output<Q>;
  readonly body: Output<B>;
  readonly request: Request;
}

interface RouteContext {
  readonly params: Promise<Record<string, string | string[] | undefined>>;
}

const readJson = (request: Request) =>
  Effect.tryPromise({
    try: () => request.json() as Promise<unknown>,
    catch: () =>
      new ValidationError({
        message: "Request body must be valid JSON",
        issues: { formErrors: ["Invalid JSON"], fieldErrors: {} },
      }),
  });

// Reads and decodes one input part, only when the route declares a schema for it.
const decodeOptional = <S extends z.ZodType | undefined>(
  schema: S | undefined,
  input: Effect.Effect<unknown, ValidationError>,
) =>
  (schema === undefined
    ? Effect.void
    : Effect.flatMap(input, (value) => decode(schema, value))) as Effect.Effect<
    Output<S>,
    ValidationError
  >;

/**
 * Builds a Next.js route handler from Zod schemas and an Effect handler: decodes params, query and
 * body (400 on failure), runs the handler through `runRequest`, encodes the result through the
 * response schema and maps failures with `errorToResponse`.
 */
export function effectRoute<
  R extends z.ZodType,
  P extends z.ZodType | undefined = undefined,
  Q extends z.ZodType | undefined = undefined,
  B extends z.ZodType | undefined = undefined,
  E extends AppError = never,
>(
  schemas: RouteSchemas<P, Q, B, R>,
  handler: (input: RouteInput<P, Q, B>) => Effect.Effect<z.output<R>, E, RequestServices>,
): (request: Request, context: RouteContext) => Promise<Response> {
  return async (request, context) => {
    const program = Effect.gen(function* () {
      const params = yield* decodeOptional(
        schemas.params,
        Effect.promise(() => context.params),
      );
      const query = yield* decodeOptional(
        schemas.query,
        Effect.sync(() => Object.fromEntries(new URL(request.url).searchParams)),
      );
      const body = yield* decodeOptional(schemas.body, readJson(request));
      const output = yield* handler({ params, query, body, request });
      return yield* encode(schemas.response, output);
    });
    const exit = await runRequest(program, {
      signal: request.signal,
      requestId: request.headers.get("x-request-id") ?? undefined,
    });
    return Exit.isSuccess(exit)
      ? Response.json(exit.value, { status: schemas.status ?? 200 })
      : errorToResponse(exit.cause);
  };
}
