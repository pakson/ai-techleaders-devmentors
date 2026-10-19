// Vitest globalSetup for `npm run test:e2e`: starts the built app (`next start`) against the test
// database (TEST_DATABASE_URL, set by `test-database.ts`), unless E2E_BASE_URL points at an
// already running instance.
import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

import { evidenceDir } from "./agent-browser";

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
  // Fresh screenshots per run (agent-browser doesn't create the directory). Only this subfolder is
  // cleared: the JUnit reporter already holds test-results/e2e/junit.xml open.
  rmSync(`${evidenceDir}/screenshots`, { recursive: true, force: true });
  mkdirSync(`${evidenceDir}/screenshots`, { recursive: true });

  if (!baseUrl) {
    const databaseUrl = process.env.TEST_DATABASE_URL;
    if (!databaseUrl) throw new Error("TEST_DATABASE_URL is not set (run test-database.ts first)");
    baseUrl = `http://127.0.0.1:${PORT}`;
    server = spawn("npx", ["next", "start", "--port", String(PORT), "--hostname", "127.0.0.1"], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { ...process.env, DATABASE_URL: databaseUrl, NODE_ENV: "production" },
      stdio: ["ignore", "pipe", "pipe"],
      // Own process group, so teardown also stops the next-server child that npx starts.
      detached: true,
    });
    // Server log: shown live and kept as evidence in test-results/e2e/server.log.
    const log = createWriteStream(`${evidenceDir}/server.log`);
    server.stdout?.pipe(log);
    server.stderr?.pipe(log);
    server.stdout?.pipe(process.stdout);
    server.stderr?.pipe(process.stderr);
    await waitForServer(baseUrl, 60_000);
  }

  project.provide("baseUrl", baseUrl);

  return async () => {
    if (server?.pid) process.kill(-server.pid, "SIGTERM");
  };
}
