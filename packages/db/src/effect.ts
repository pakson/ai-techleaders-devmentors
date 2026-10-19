import { Conflict, DbError, NotFound } from "@devmentor/core/errors";
import {
  NotFoundError,
  OptimisticLockError,
  UniqueConstraintViolationException,
} from "@mikro-orm/core";
import type { EntityManager } from "@mikro-orm/postgresql";
import { Context, Effect, Exit } from "effect";

/**
 * The request's `EntityManager` fork as an Effect service. Services declare `Db` in the `R`
 * channel of their methods instead of capturing it, so one service instance serves every request
 * and `withTransaction` only has to re-provide `Db`.
 */
export class Db extends Context.Service<Db, EntityManager>()("db/Db") {}

/** Maps a MikroORM/driver exception to the error taxonomy. Unknown failures become `DbError`. */
export function mapDbError(error: unknown): Conflict | NotFound | DbError {
  if (error instanceof UniqueConstraintViolationException) {
    return new Conflict({ message: "Resource already exists", cause: error });
  }
  if (error instanceof OptimisticLockError) {
    return new Conflict({ message: "Resource was modified concurrently", cause: error });
  }
  if (error instanceof NotFoundError) {
    return new NotFound({ resource: error.entity?.constructor.name ?? "resource" });
  }
  return new DbError({ cause: error });
}

/** Runs one MikroORM call against the current `Db` and maps its exceptions (`mapDbError`). */
export function dbTry<A>(
  query: (em: EntityManager) => Promise<A>,
): Effect.Effect<A, Conflict | NotFound | DbError, Db> {
  return Db.use((em) => Effect.tryPromise({ try: () => query(em), catch: mapDbError }));
}

/**
 * Runs `effect` in a database transaction: commits (flushing first) on success, rolls back on any
 * failure, defect or interruption. Nested calls join the outer transaction. The boundary belongs
 * in the use case, never in repositories.
 */
export function withTransaction<A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E | Conflict | NotFound | DbError, R | Db> {
  return Db.use((em) => {
    if (em.isInTransaction()) return effect;
    return Effect.acquireUseRelease(
      Effect.tryPromise({
        try: async () => {
          const tx = em.fork({ clear: false });
          await tx.begin();
          return tx;
        },
        catch: mapDbError,
      }),
      (tx) =>
        effect.pipe(
          Effect.provideService(Db, tx),
          Effect.tap(() => Effect.tryPromise({ try: () => tx.commit(), catch: mapDbError })),
        ),
      (tx, exit) =>
        Exit.isSuccess(exit)
          ? Effect.void
          : // A rollback failure must not hide the original error; the connection is discarded.
            Effect.promise(() => tx.rollback()).pipe(
              Effect.catchCause((cause) => Effect.logWarning("Transaction rollback failed", cause)),
            ),
    );
  });
}
