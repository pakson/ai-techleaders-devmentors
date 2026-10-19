import { DbError } from "@devmentor/core/errors";
import { Db, type EntityManager } from "@devmentor/db";
import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { HealthService } from "../health-service";

const withEm = (execute: () => Promise<unknown>) =>
  Effect.provideService(Db, { execute } as unknown as EntityManager);

describe("HealthService", () => {
  it.effect("reports ok when the database answers", () =>
    Effect.gen(function* () {
      const health = yield* HealthService;
      const result = yield* health.check().pipe(withEm(async () => [{ "?column?": 1 }]));
      assert.deepStrictEqual(result, { status: "ok" });
    }).pipe(Effect.provide(HealthService.layer)),
  );

  it.effect("fails with DbError when the database is unreachable", () =>
    Effect.gen(function* () {
      const health = yield* HealthService;
      const error = yield* health.check().pipe(
        withEm(() => Promise.reject(new Error("ECONNREFUSED"))),
        Effect.flip,
      );
      assert.instanceOf(error, DbError);
    }).pipe(Effect.provide(HealthService.layer)),
  );
});
