import { asClass, createAppContainer, type AppContainer } from "@devmentor/core";
import { getOrm, registerDb, type DbCradle } from "@devmentor/db";

import { HealthService } from "@/services/health-service";

/** Everything resolvable from the container. Extend it when adding a module. */
export interface AppCradle extends DbCradle {
  healthService: HealthService;
}

function registerAppServices(container: AppContainer<AppCradle>): void {
  container.register({
    // Scoped, because it depends on the request-scoped `em`.
    healthService: asClass(HealthService).scoped(),
  });
}

// Composition root: one container per process, kept on globalThis to survive dev HMR.
const globalForContainer = globalThis as typeof globalThis & {
  __devmentorContainer?: Promise<AppContainer<AppCradle>>;
};

export function getContainer(): Promise<AppContainer<AppCradle>> {
  globalForContainer.__devmentorContainer ??= (async () => {
    const orm = await getOrm();
    return createAppContainer<AppCradle>([registerDb(orm), registerAppServices]);
  })().catch((error: unknown) => {
    globalForContainer.__devmentorContainer = undefined;
    throw error;
  });
  return globalForContainer.__devmentorContainer;
}

/**
 * Creates a container scope for one unit of work (request, server action, job).
 * Scoped registrations such as `em` are fresh in each scope.
 */
export async function createRequestScope(): Promise<AppContainer<AppCradle>> {
  return (await getContainer()).createScope();
}
