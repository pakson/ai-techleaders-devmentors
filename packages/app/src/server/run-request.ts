import "server-only";

import { isUnexpected } from "@devmentor/core/http";
import { DbError, type AppError } from "@devmentor/core/errors";
import { Db } from "@devmentor/db";
import { Cause, Effect, type Exit } from "effect";

import { createRequestScope } from "@/di/container";

import { RequestContext } from "./request-context";
import { getRuntime, type AppServices } from "./runtime";

/** Everything an edge program may require. */
export type RequestServices = AppServices | Db | RequestContext;

export interface RunRequestOptions {
  /** Interrupts the program when aborted (pass `request.signal`). */
  readonly signal?: AbortSignal;
  readonly requestId?: string;
}

const acquireEm = Effect.tryPromise({
  try: async () => (await createRequestScope()).cradle.em,
  catch: (cause) => new DbError({ cause }),
});

/**
 * The only way edge code (routes, actions, server components) runs an effect. Provides a fresh
 * `EntityManager` fork as `Db` and the `RequestContext`, logs unexpected failures and returns the
 * `Exit`. Call Next's `redirect()` / `notFound()` after it returns, never inside the effect.
 */
export function runRequest<A, E extends AppError>(
  program: Effect.Effect<A, E, RequestServices>,
  options: RunRequestOptions = {},
): Promise<Exit.Exit<A, E | DbError>> {
  const requestId = options.requestId ?? crypto.randomUUID();
  const effect = Effect.gen(function* () {
    const em = yield* acquireEm;
    return yield* program.pipe(Effect.provideService(Db, em));
  }).pipe(
    Effect.tapCause((cause) =>
      isUnexpected(cause) ? Effect.logError("Request failed", Cause.pretty(cause)) : Effect.void,
    ),
    Effect.provideService(RequestContext, { requestId }),
    Effect.annotateLogs({ requestId }),
  );
  return getRuntime().runPromiseExit(effect, { signal: options.signal });
}
