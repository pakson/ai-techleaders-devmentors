import "server-only";

import type { AppError } from "@devmentor/core/errors";
import { mapCause } from "@devmentor/core/http";
import { decode, encode } from "@devmentor/core/validation";
import { Effect, Exit } from "effect";
import type { z } from "zod";

import { runRequest, type RequestServices } from "./run-request";

/** What a server action returns to the client. Plain data only: no class instances. */
export type ActionResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: string;
        readonly message: string;
        readonly fieldErrors?: Readonly<Record<string, ReadonlyArray<string> | undefined>>;
      };
    };

/**
 * Builds a server action from Zod schemas and an Effect handler: decodes the input, runs the
 * handler through `runRequest`, encodes the result through the output schema and returns an
 * `ActionResult`. Use it inside a `"use server"` module.
 */
export function effectAction<I extends z.ZodType, O extends z.ZodType, E extends AppError = never>(
  schemas: { readonly input: I; readonly output: O },
  handler: (input: z.output<I>) => Effect.Effect<z.output<O>, E, RequestServices>,
): (input: z.input<I>) => Promise<ActionResult<z.input<O>>> {
  return async (input) => {
    const program = decode(schemas.input, input).pipe(
      Effect.flatMap(handler),
      Effect.flatMap((output) => encode(schemas.output, output)),
    );
    const exit = await runRequest(program);
    if (Exit.isSuccess(exit)) return { ok: true, data: exit.value };
    const { error, issues } = mapCause(exit.cause);
    return {
      ok: false,
      error: { code: error.code, message: error.message, fieldErrors: issues?.fieldErrors },
    };
  };
}
