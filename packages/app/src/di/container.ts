import { createAppContainer, type AppContainer } from "@devmentor/core/di";
import { getOrm, registerDb, type DbCradle } from "@devmentor/db";

// Awilix only bootstraps infrastructure (the ORM and the per-request `em` fork). Application
// services are Effect layers composed in `src/server/runtime.ts`.

/** Everything resolvable from the container. */
export type AppCradle = DbCradle;

// Composition root: one container per process, kept on globalThis to survive dev HMR.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AppContainer<AppCradle>>;
};

export function getContainer(): Promise<AppContainer<AppCradle>> {
  globalForContainer.__devmentorContainer ??= (async () => {
    const orm = await getOrm();
    return createAppContainer<AppCradle>([registerDb(orm)]);
  })().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
}

/**
 * Creates a container scope for one unit of work (request, server action, job).
 * Scoped registrations such as `em` are fresh in each scope. Edge code uses `runRequest`.
 */
export async function createRequestScope(): Promise<AppContainer<AppCradle>> {
  return (await getContainer()).createScope();
}
