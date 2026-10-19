import { Conflict, DbError, NotFound } from "@devmentor/core/errors";
import { assert, describe, it } from "@effect/vitest";
import {
  NotFoundError,
  OptimisticLockError,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Effect, Exit } from "effect";
import { vi } from "vitest";

import { Db, dbTry, mapDbError, withTransaction } from "../effect";

describe("mapDbError", () => {
  it("maps a unique violation to Conflict", () => {
    const error = mapDbError(new UniqueConstraintViolationException(new Error("duplicate key")));
    assert.instanceOf(error, Conflict);
    assert.strictEqual(error.message, "Resource already exists");
  });

  it("maps an optimistic lock failure to Conflict", () => {
    const error = mapDbError(OptimisticLockError.lockFailed("User"));
    assert.instanceOf(error, Conflict);
    assert.strictEqual(error.message, "Resource was modified concurrently");
  });

  it("maps NotFoundError to NotFound, named after the entity when known", () => {
    class Session {}
    assert.deepStrictEqual(
      mapDbError(new NotFoundError("missing", new Session())),
      new NotFound({ resource: "Session" }),
    );
    assert.deepStrictEqual(
      mapDbError(NotFoundError.findOneFailed("User", { id: 1 })),
      new NotFound({ resource: "resource" }),
    );
  });

  it("wraps anything else in DbError", () => {
    const cause = new Error("ECONNREFUSED");
    assert.deepStrictEqual(mapDbError(cause), new DbError({ cause }));
  });
});

describe("dbTry", () => {
  it.effect("runs the query against the current Db and maps its failure", () =>
    Effect.gen(function* () {
      const em = { marker: "em" } as unknown as EntityManager;
      const value = yield* dbTry(async (current) => current).pipe(Effect.provideService(Db, em));
      assert.strictEqual(value, em);
      const error = yield* dbTry(() => Promise.reject(new Error("boom"))).pipe(
        Effect.provideService(Db, em),
        Effect.flip,
      );
      assert.instanceOf(error, DbError);
    }),
  );
});

// A fake EntityManager whose fork records the transaction calls.
function fakeEm(
  options: {
    inTransaction?: boolean;
    begin?: () => Promise<void>;
    commit?: () => Promise<void>;
  } = {},
) {
  const tx = {
    begin: vi.fn(options.begin ?? (async () => undefined)),
    commit: vi.fn(options.commit ?? (async () => undefined)),
    rollback: vi.fn(async () => undefined),
  };
  const em = {
    isInTransaction: () => options.inTransaction ?? false,
    fork: vi.fn(() => tx),
  };
  return { em: em as unknown as EntityManager, fork: em.fork, tx };
}

const currentDb = Db.use((em) => Effect.succeed(em));

describe("withTransaction", () => {
  it.effect("begins a transaction on a fork, provides it as Db and commits", () =>
    Effect.gen(function* () {
      const { em, fork, tx } = fakeEm();
      const db = yield* withTransaction(currentDb).pipe(Effect.provideService(Db, em));
      assert.strictEqual(db, tx as unknown);
      assert.deepStrictEqual(fork.mock.calls, [[{ clear: false }]]);
      assert.strictEqual(tx.begin.mock.calls.length, 1);
      assert.strictEqual(tx.commit.mock.calls.length, 1);
      assert.strictEqual(tx.rollback.mock.calls.length, 0);
    }),
  );

  it.effect("rolls back and keeps the original error when the effect fails", () =>
    Effect.gen(function* () {
      const { em, tx } = fakeEm();
      const error = yield* withTransaction(Effect.fail("boom" as const)).pipe(
        Effect.provideService(Db, em),
        Effect.flip,
      );
      assert.strictEqual(error, "boom");
      assert.strictEqual(tx.commit.mock.calls.length, 0);
      assert.strictEqual(tx.rollback.mock.calls.length, 1);
    }),
  );

  it.effect("rolls back when the commit fails and maps the failure", () =>
    Effect.gen(function* () {
      const { em, tx } = fakeEm({ commit: () => Promise.reject(new Error("serialization")) });
      const error = yield* withTransaction(Effect.void).pipe(
        Effect.provideService(Db, em),
        Effect.flip,
      );
      assert.instanceOf(error, DbError);
      assert.strictEqual(tx.rollback.mock.calls.length, 1);
    }),
  );

  it.effect("fails with the mapped error when the transaction can't begin", () =>
    Effect.gen(function* () {
      const { em, tx } = fakeEm({ begin: () => Promise.reject(new Error("pool exhausted")) });
      const error = yield* withTransaction(Effect.void).pipe(
        Effect.provideService(Db, em),
        Effect.flip,
      );
      assert.instanceOf(error, DbError);
      assert.strictEqual(tx.rollback.mock.calls.length, 0);
    }),
  );

  it.effect("a failed rollback does not hide the original error", () =>
    Effect.gen(function* () {
      const { em, tx } = fakeEm();
      tx.rollback.mockRejectedValueOnce(new Error("connection lost"));
      const exit = yield* withTransaction(Effect.fail("boom" as const)).pipe(
        Effect.provideService(Db, em),
        Effect.exit,
      );
      assert.deepStrictEqual(exit, Exit.fail("boom"));
    }),
  );

  it.effect("joins the outer transaction instead of opening a new one", () =>
    Effect.gen(function* () {
      const { em, fork } = fakeEm({ inTransaction: true });
      const db = yield* withTransaction(currentDb).pipe(Effect.provideService(Db, em));
      assert.strictEqual(db, em);
      assert.strictEqual(fork.mock.calls.length, 0);
    }),
  );
});
