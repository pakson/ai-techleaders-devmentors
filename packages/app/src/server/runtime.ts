import "server-only";

import { Layer, ManagedRuntime } from "effect";

import { HealthService } from "@/modules/health/health-service";

/** Process-lifetime services. Add each module's layer here. */
export const AppLayer = Layer.mergeAll(HealthService.layer);

export type AppServices = Layer.Success<typeof AppLayer>;

// One runtime per process, created on first use (never at import, so `next build` needs no
// database) and kept on globalThis so dev-mode HMR reuses it.
const globalForRuntime = globalThis as typeof globalThis & {
  __devmentorRuntime?: ManagedRuntime.ManagedRuntime<AppServices, never>;
};

export function getRuntime(): ManagedRuntime.ManagedRuntime<AppServices, never> {
  globalForRuntime.__devmentorRuntime ??= ManagedRuntime.make(AppLayer);
  return globalForRuntime.__devmentorRuntime;
}
