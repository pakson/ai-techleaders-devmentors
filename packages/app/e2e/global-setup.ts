// Vitest globalSetup for `npm run test:e2e`: starts the built app (`next start`) against
// TEST_DATABASE_URL, unless E2E_BASE_URL points at an already running instance.
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    baseUrl: string;
  }
}

const PORT = 3100;

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(
    `App did not start at ${url} within ${timeoutMs} ms (did you run npm run build?)`,
  );
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  let server: ChildProcess | undefined;
  let baseUrl = process.env.E2E_BASE_URL;

  if (!baseUrl) {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl)
      throw new Error("TEST_DATABASE_URL (or E2E_BASE_URL) is required for e2e tests");
    baseUrl = `http://127.0.0.1:${PORT}`;
    server = spawn("npx", ["next", "start", "--port", String(PORT), "--hostname", "127.0.0.1"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "production" },
      stdio: "inherit",
      // Own process group, so teardown also stops the next-server child that npx starts.
      detached: true,
    });
    await waitForServer(baseUrl, 60_000);
  }

  project.provide("baseUrl", baseUrl);

  return async () => {
    if (server?.pid) process.kill(-server.pid, "SIGTERM");
  };
}
