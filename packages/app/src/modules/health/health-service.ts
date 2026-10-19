import type { DbError } from "@devmentor/core/errors";
import { Db, dbTry } from "@devmentor/db";
import { Context, Effect, Layer } from "effect";

import type { HealthDto } from "./schemas";

/** Reference service: checks that the database is reachable. */
export class HealthService extends Context.Service<
  HealthService,
  {
    readonly check: () => Effect.Effect<HealthDto, DbError, Db>;
  }
>()("health/HealthService") {
  static readonly layer = Layer.succeed(HealthService, {
    check: Effect.fn("HealthService.check")(function* () {
      // `execute` never raises Conflict/NotFound; any failure means the database is unavailable.
      yield* dbTry((em) => em.execute("select 1")).pipe(
        Effect.catchTag(["Conflict", "NotFound"], (error) => Effect.die(error)),
      );
      return { status: "ok" as const };
    }),
  });
}
