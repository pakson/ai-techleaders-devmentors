import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { runCommand, runInstaller, waitForPostgres } from "../packages/core/src/setup/installer.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const result = await runInstaller({
  projectRoot,
  commandRunner: runCommand,
  readinessCheck: waitForPostgres,
  writeOut: console.log,
  writeError: console.error,
});
process.exitCode = result.exitCode;
