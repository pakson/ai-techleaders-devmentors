import { Conflict } from "@devmentor/core/errors";
import { assert, describe, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { afterAll, beforeAll } from "vitest";

import { Db, dbTry, withTransaction } from "../effect";
import { User } from "../entities";
import { closeOrm, getOrm } from "../orm";

const PREFIX = "int-effect-";

const withFreshDb = <A, E>(effect: Effect.Effect<A, E, Db>) =>
  Effect.flatMap(
    Effect.promise(() => getOrm()),
    (orm) => Effect.provideService(effect, Db, orm.em.fork()),
  );

const createUser = (email: string) =>
  dbTry(async (em) => {
    const user = em.create(User, { email: `${PREFIX}${email}`, name: "Ada" });
    await em.flush();
    return user;
  });

const countUsers = (email: string) =>
  withFreshDb(dbTry((em) => em.count(User, { email: `${PREFIX}${email}` })));

const cleanUp = async () => {
  const orm = await getOrm();
  await orm.em.fork().nativeDelete(User, { email: { $like: `${PREFIX}%` } });
};

describe("withTransaction", () => {
  beforeAll(cleanUp);
  afterAll(async () => {
    await cleanUp();
    await closeOrm();
  });

  it.effect("commits on success", () =>
    Effect.gen(function* () {
      yield* withFreshDb(withTransaction(createUser("commit@example.com")));
      assert.strictEqual(yield* countUsers("commit@example.com"), 1);
    }),
  );

  it.effect("rolls back on failure", () =>
    Effect.gen(function* () {
      const exit = yield* withFreshDb(
        withTransaction(
          Effect.gen(function* () {
            yield* createUser("rollback@example.com");
            return yield* Effect.fail("boom" as const);
          }),
        ),
      ).pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(exit));
      assert.strictEqual(yield* countUsers("rollback@example.com"), 0);
    }),
  );

  it.effect("joins the outer transaction when nested", () =>
    Effect.gen(function* () {
      const exit = yield* withFreshDb(
        withTransaction(
          Effect.gen(function* () {
            yield* withTransaction(createUser("nested@example.com"));
            return yield* Effect.die("outer fails after the inner one succeeded");
          }),
        ),
      ).pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(exit));
      assert.strictEqual(yield* countUsers("nested@example.com"), 0);
    }),
  );
});

describe("dbTry", () => {
  it.effect("maps a unique violation to Conflict", () =>
    Effect.gen(function* () {
      yield* withFreshDb(createUser("unique@example.com"));
      const error = yield* withFreshDb(createUser("unique@example.com")).pipe(Effect.flip);
      assert.instanceOf(error, Conflict);
    }),
  );

  it.effect("generates UUIDv7 ids", () =>
    Effect.gen(function* () {
      const user = yield* withFreshDb(createUser("uuid@example.com"));
      assert.match(
        user.id,
        /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }),
  );
});
