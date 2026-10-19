import { asFunction, asValue, type AppContainer } from "@devmentor/core";
import type { EntityManager, MikroORM } from "@mikro-orm/postgresql";

export interface DbCradle {
  /** Process-wide ORM (singleton). Prefer `em` in application code. */
  orm: MikroORM;
  /** Scoped EntityManager: a fresh fork (own identity map / unit of work) per container scope. */
  em: EntityManager;
}

/**
 * Registers the database services. Takes an already initialized ORM, because Awilix resolution
 * is synchronous and `MikroORM.init` isn't.
 */
export function registerDb(orm: MikroORM) {
  return (container: AppContainer<DbCradle>): void => {
    container.register({
      orm: asValue(orm),
      em: asFunction(({ orm }: DbCradle) => orm.em.fork()).scoped(),
    });
  };
}
