import { Conflict, DbError } from "@devmentor/core/errors";
import { Db, type EntityManager } from "@devmentor/db";
import { assert, describe, it } from "@effect/vitest";
import { Cause, Effect, Exit } from "effect";
import { UniqueConstraintViolationException } from "@mikro-orm/core";

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

  it.effect("treats Conflict/NotFound from `select 1` as a defect", () =>
    Effect.gen(function* () {
      const health = yield* HealthService;
      const exit = yield* health.check().pipe(
        withEm(() => Promise.reject(new UniqueConstraintViolationException(new Error("dup")))),
        Effect.exit,
      );
      assert.isTrue(Exit.isFailure(exit));
      if (Exit.isFailure(exit)) {
        assert.isTrue(Cause.hasDies(exit.cause));
        assert.instanceOf(Cause.squash(exit.cause), Conflict);
      }
    }).pipe(Effect.provide(HealthService.layer)),
  );
});
