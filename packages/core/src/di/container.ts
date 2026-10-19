import { createContainer, InjectionMode, type AwilixContainer } from "awilix";

export type AppContainer<TCradle extends object = object> = AwilixContainer<TCradle>;

/**
 * A container module registers one package's/feature's services into the container.
 * Each package exposes its own module (e.g. `registerDb`), and the app composes them.
 */
export type ContainerModule<TCradle extends object = object> = (
  container: AppContainer<TCradle>,
) => void;

/**
 * Creates the Awilix container with the project-wide defaults:
 * - `PROXY` injection mode: dependencies are destructured from the cradle (`({ em }) => ...`),
 *   which is safe under minification.
 * - `strict` mode: a singleton can't depend on a scoped/transient registration
 *   (for example a request-scoped EntityManager), so lifetime leaks are caught early.
 */
export function createAppContainer<TCradle extends object>(
  modules: ReadonlyArray<ContainerModule<TCradle>> = [],
): AppContainer<TCradle> {
  const container = createContainer<TCradle>({
    injectionMode: InjectionMode.PROXY,
    strict: true,
  });

  for (const register of modules) {
    register(container);
  }

  return container;
}
