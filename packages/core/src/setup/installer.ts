import { access, readFile, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";
import { createInterface } from "node:readline/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { join } from "node:path";

export const MIN_NODE_VERSION = "22.17.0";
export const READINESS_TIMEOUT_MS = 60_000;
export const READINESS_INTERVAL_MS = 500;

export type FileSystem = {
  exists: (path: string) => Promise<boolean>;
  read: (path: string) => Promise<string>;
  write: (path: string, contents: string) => Promise<void>;
};

export type CommandOptions = { cwd: string; env: NodeJS.ProcessEnv };
export type CommandResult = { exitCode: number; signal: NodeJS.Signals | null };
export type CommandRunner = (
  command: string,
  args: ReadonlyArray<string>,
  options: CommandOptions,
) => Promise<CommandResult>;

export type DatabaseTarget = {
  host: string;
  port: number;
  database: string;
  redacted: string;
};

export type InstallerResult = {
  exitCode: number;
  failedStep?: string;
};

export type InstallerOptions = {
  projectRoot: string;
  env?: NodeJS.ProcessEnv;
  nodeVersion?: string;
  platform?: NodeJS.Platform;
  fileSystem?: FileSystem;
  commandRunner: CommandRunner;
  readinessCheck: (target: DatabaseTarget) => Promise<boolean>;
  stdinIsTTY?: boolean;
  confirmExternalDatabase?: () => Promise<boolean>;
  writeOut: (message: string) => void;
  writeError: (message: string) => void;
};

const defaultFileSystem: FileSystem = {
  exists: async (path) => {
    try {
      await access(path);
      return true;
    } catch {
      return false;
    }
  },
  read: (path) => readFile(path, "utf8"),
  write: (path, contents) => writeFile(path, contents, "utf8"),
};

const npmCommand = (platform: NodeJS.Platform): string =>
  platform === "win32" ? "npm.cmd" : "npm";

const dockerCommand = (platform: NodeJS.Platform): string =>
  platform === "win32" ? "docker.cmd" : "docker";

const versionParts = (version: string): ReadonlyArray<number> =>
  version
    .split(".")
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);

const isVersionAtLeast = (actual: string): boolean => {
  const actualParts = versionParts(actual);
  const minimumParts = [22, 17, 0] as const;
  for (const index of [0, 1, 2] as const) {
    const actualPart = actualParts[index] ?? 0;
    const minimumPart = minimumParts[index];
    if (actualPart > minimumPart) return true;
    if (actualPart < minimumPart) return false;
  }
  return true;
};

export const stripQuotes = (value: string): string => {
  if (
    value.length >= 2 &&
    ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'")))
  ) {
    return value.slice(1, -1);
  }
  return value;
};

export const parseEnvFile = (contents: string): Record<string, string> => {
  const values: Record<string, string> = {};
  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const assignment = line.startsWith("export ") ? line.slice(7) : line;
    const separator = assignment.indexOf("=");
    if (separator < 1) continue;
    const key = assignment.slice(0, separator).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/u.test(key)) continue;
    values[key] = stripQuotes(assignment.slice(separator + 1).trim());
  }
  return values;
};

export const redactOutput = (message: string): string =>
  message
    .replace(/postgres(?:ql)?:\/\/[^\s'"`]+/giu, "postgres://[REDACTED]")
    .replace(/(DATABASE_URL\s*[=:]\s*)[^\s'"`]+/giu, "$1[REDACTED]");

export const parseDatabaseTarget = (value: string): DatabaseTarget => {
  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql scheme");
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//u, ""));
  const port = url.port === "" ? 5432 : Number.parseInt(url.port, 10);
  if (url.hostname === "" || database === "" || !Number.isInteger(port)) {
    throw new Error("DATABASE_URL must include a database host and name");
  }
  return {
    host: url.hostname.replace(/^\[/u, "").replace(/\]$/u, ""),
    port,
    database,
    redacted: `${url.protocol}//${url.hostname}:${port}/${database}`,
  };
};

export const isLocalDatabaseTarget = (target: DatabaseTarget): boolean =>
  ["localhost", "127.0.0.1", "::1"].includes(target.host.toLowerCase()) &&
  target.port === 5432 &&
  target.database === "devmentor";

export const runCommand: CommandRunner = (command, args, options) =>
  new Promise((resolve) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      stdio: ["inherit", "pipe", "pipe"],
    });
    const forwardSignal = (signal: NodeJS.Signals): void => {
      child.kill(signal);
    };
    const onInterrupt = (): void => forwardSignal("SIGINT");
    const onTerminate = (): void => forwardSignal("SIGTERM");
    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onTerminate);
    child.stdout.on("data", (chunk: Buffer) =>
      process.stdout.write(redactOutput(chunk.toString())),
    );
    child.stderr.on("data", (chunk: Buffer) =>
      process.stderr.write(redactOutput(chunk.toString())),
    );
    child.once("error", () => {
      process.removeListener("SIGINT", onInterrupt);
      process.removeListener("SIGTERM", onTerminate);
      resolve({ exitCode: 1, signal: null });
    });
    child.once("exit", (exitCode, signal) => {
      process.removeListener("SIGINT", onInterrupt);
      process.removeListener("SIGTERM", onTerminate);
      resolve({ exitCode: exitCode ?? 1, signal });
    });
  });

export type ReadinessOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  connect?: (target: DatabaseTarget) => Promise<boolean>;
};

export const waitForPostgres = async (
  target: DatabaseTarget,
  options: ReadinessOptions = {},
): Promise<boolean> => {
  const timeoutMs = options.timeoutMs ?? READINESS_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? READINESS_INTERVAL_MS;
  const connect =
    options.connect ??
    ((database: DatabaseTarget) =>
      new Promise<boolean>((resolve) => {
        const socket = createConnection({ host: database.host, port: database.port });
        const finish = (result: boolean): void => {
          socket.removeAllListeners();
          socket.destroy();
          resolve(result);
        };
        socket.setTimeout(intervalMs);
        socket.once("connect", () => finish(true));
        socket.once("timeout", () => finish(false));
        socket.once("error", () => finish(false));
      }));
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await connect(target)) return true;
    await sleep(intervalMs);
  }
  return false;
};

const askForExternalDatabase = async (): Promise<boolean> => {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(
      "DATABASE_URL is outside the local DevMentor database. Continue? [y/N] ",
    );
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    prompt.close();
  }
};

const reportFailure = (
  writeError: (message: string) => void,
  step: string,
  message: string,
): InstallerResult => {
  writeError(`✗ ${step}: ${redactOutput(message)}`);
  return { exitCode: 1, failedStep: step };
};

export async function runInstaller(options: InstallerOptions): Promise<InstallerResult> {
  const env = options.env ?? process.env;
  const platform = options.platform ?? process.platform;
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const commandRunner = options.commandRunner;
  const readinessCheck = options.readinessCheck;
  const writeOut = options.writeOut;
  const writeError = options.writeError;
  const nodeVersion = options.nodeVersion ?? process.versions.node;
  const run = (command: string, args: ReadonlyArray<string>): Promise<CommandResult> =>
    commandRunner(command, args, { cwd: options.projectRoot, env });
  const npm = npmCommand(platform);

  if (!isVersionAtLeast(nodeVersion)) {
    return reportFailure(
      writeError,
      "prerequisites",
      `Node.js ${MIN_NODE_VERSION} or newer is required (found ${nodeVersion})`,
    );
  }

  const nodeModules = join(options.projectRoot, "node_modules");
  const packageLock = join(nodeModules, ".package-lock.json");
  if ((await fileSystem.exists(nodeModules)) && (await fileSystem.exists(packageLock))) {
    writeOut("✓ Dependencies already installed; skipping npm install.");
  } else {
    writeOut("→ Installing workspace dependencies...");
    const result = await run(npm, ["install"]);
    if (result.exitCode !== 0)
      return reportFailure(
        writeError,
        "dependencies",
        `npm install failed with exit code ${result.exitCode}`,
      );
  }

  const envPath = join(options.projectRoot, "packages", "app", ".env.local");
  const examplePath = join(options.projectRoot, "packages", "app", ".env.example");
  let envContents: string;
  if (await fileSystem.exists(envPath)) {
    envContents = await fileSystem.read(envPath);
    writeOut("✓ Existing packages/app/.env.local preserved.");
  } else {
    if (!(await fileSystem.exists(examplePath))) {
      return reportFailure(writeError, "environment", "packages/app/.env.example is missing");
    }
    envContents = await fileSystem.read(examplePath);
    await fileSystem.write(envPath, envContents);
    writeOut("✓ Created packages/app/.env.local from the example.");
  }

  const values = { ...parseEnvFile(envContents), ...env };
  const databaseUrl = values.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl === "") {
    return reportFailure(
      writeError,
      "environment",
      "DATABASE_URL is missing from the environment or packages/app/.env.local",
    );
  }
  let target: DatabaseTarget;
  try {
    target = parseDatabaseTarget(databaseUrl);
  } catch (error) {
    return reportFailure(
      writeError,
      "environment",
      error instanceof Error ? error.message : "DATABASE_URL is invalid",
    );
  }

  const localTarget = isLocalDatabaseTarget(target);
  if (!localTarget) {
    const allowedByEnvironment = values.DEVMENTOR_SETUP_ALLOW_EXTERNAL_DATABASE === "1";
    const confirmed =
      allowedByEnvironment ||
      (options.stdinIsTTY === true &&
        (await (options.confirmExternalDatabase ?? askForExternalDatabase)()));
    if (!confirmed) {
      return reportFailure(
        writeError,
        "database target",
        `External database ${target.redacted} was not confirmed`,
      );
    }
    writeOut("✓ External database target explicitly confirmed.");
  }

  if (localTarget) {
    writeOut("→ Starting or reusing the local PostgreSQL service...");
    const result = await run(dockerCommand(platform), ["compose", "up", "-d", "postgres"]);
    if (result.exitCode !== 0)
      return reportFailure(
        writeError,
        "database service",
        `docker compose failed with exit code ${result.exitCode}`,
      );
  } else {
    writeOut("✓ Using the confirmed existing PostgreSQL service.");
  }

  writeOut("→ Waiting for PostgreSQL readiness...");
  if (!(await readinessCheck(target))) {
    return reportFailure(
      writeError,
      "database readiness",
      `PostgreSQL did not accept connections at ${target.host}:${target.port} within ${READINESS_TIMEOUT_MS / 1000} seconds`,
    );
  }

  writeOut("→ Applying pending migrations...");
  const migration = await run(npm, ["run", "db:migration:up"]);
  if (migration.exitCode !== 0)
    return reportFailure(
      writeError,
      "migrations",
      `migration command failed with exit code ${migration.exitCode}`,
    );
  writeOut("✓ DevMentor is ready. Run npm run dev to start the app.");
  return { exitCode: 0 };
}
