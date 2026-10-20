import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:readline/promises", () => ({
  createInterface: vi.fn(() => ({
    question: vi.fn().mockResolvedValue("yes"),
    close: vi.fn(),
  })),
}));

vi.mock("node:net", () => ({
  createConnection: vi.fn(({ host }: { host: string }) => {
    const handlers: Record<string, () => void> = {};
    const socket = {
      removeAllListeners: vi.fn(),
      destroy: vi.fn(),
      setTimeout: vi.fn(),
      once: vi.fn((event: string, handler: () => void) => {
        handlers[event] = handler;
      }),
    };
    queueMicrotask(() => {
      const event =
        host === "connect.test" ? "connect" : host === "timeout.test" ? "timeout" : "error";
      handlers[event]?.();
    });
    return socket;
  }),
}));

import {
  MIN_NODE_VERSION,
  READINESS_INTERVAL_MS,
  READINESS_TIMEOUT_MS,
  isLocalDatabaseTarget,
  parseDatabaseTarget,
  parseEnvFile,
  redactOutput,
  runCommand,
  runInstaller,
  stripQuotes,
  waitForPostgres,
  type CommandResult,
  type FileSystem,
  type InstallerOptions,
} from "../installer";

const root = "/project";
const envPath = join(root, "packages", "app", ".env.local");
const examplePath = join(root, "packages", "app", ".env.example");
const nodeModules = join(root, "node_modules");
const packageLock = join(nodeModules, ".package-lock.json");
const localUrl = "postgres://devmentor:devmentor@localhost:5432/devmentor";
const externalUrl = "postgres://devmentor:devmentor@db.example.test:5433/coaching";

type CommandCall = { command: string; args: ReadonlyArray<string> };

const successfulCommand = (): {
  calls: CommandCall[];
  runner: NonNullable<InstallerOptions["commandRunner"]>;
} => {
  const calls: CommandCall[] = [];
  const runner = vi.fn(
    async (command: string, args: ReadonlyArray<string>): Promise<CommandResult> => {
      calls.push({ command, args });
      return { exitCode: 0, signal: null };
    },
  );
  return { calls, runner };
};

const fakeFileSystem = (initial: Record<string, string>): FileSystem => {
  const files = { ...initial };
  return {
    exists: vi.fn(async (path: string) => Object.hasOwn(files, path)),
    read: vi.fn(async (path: string) => {
      const value = files[path];
      if (value === undefined) throw new Error(`missing ${path}`);
      return value;
    }),
    write: vi.fn(async (path: string, contents: string) => {
      files[path] = contents;
    }),
  };
};

const optionsFor = (
  initial: Record<string, string>,
  overrides: Partial<InstallerOptions> = {},
): InstallerOptions => {
  const command = successfulCommand();
  return {
    projectRoot: root,
    env: { DATABASE_URL: localUrl },
    nodeVersion: MIN_NODE_VERSION,
    fileSystem: fakeFileSystem(initial),
    commandRunner: command.runner,
    readinessCheck: vi.fn(async () => true),
    writeOut: vi.fn(),
    writeError: vi.fn(),
    ...overrides,
  };
};

describe("installer parsing", () => {
  it("parses supported env lines and ignores malformed input", () => {
    expect(
      parseEnvFile(`
      # comment
      DATABASE_URL="postgres://localhost/db"
      export DB_DEBUG=false
      INVALID
      lower=value
      ONE=x
      EMPTY=
      DB_POOL_MAX=10 # keep inline text
    `),
    ).toEqual({
      DATABASE_URL: "postgres://localhost/db",
      DB_DEBUG: "false",
      ONE: "x",
      EMPTY: "",
      DB_POOL_MAX: "10 # keep inline text",
    });
  });

  it("parses database targets and recognizes only the documented local tuple", () => {
    const target = parseDatabaseTarget(localUrl);
    expect(target).toMatchObject({ host: "localhost", port: 5432, database: "devmentor" });
    expect(isLocalDatabaseTarget(target)).toBe(true);
    expect(isLocalDatabaseTarget({ ...target, port: 5433 })).toBe(false);
    expect(isLocalDatabaseTarget({ ...target, database: "other" })).toBe(false);
    expect(parseDatabaseTarget("postgresql://user:pass@[::1]/devmentor").host).toBe("::1");
  });

  it("rejects unsupported and incomplete database URLs", () => {
    expect(() => parseDatabaseTarget("https://example.test/db")).toThrow(
      "DATABASE_URL must use the postgres or postgresql scheme",
    );
    expect(() => parseDatabaseTarget("postgres://localhost/")).toThrow(
      "DATABASE_URL must include a database host and name",
    );
  });

  it("redacts database URLs and credential assignments", () => {
    const value = redactOutput(
      "postgres://user:secret@localhost:5432/devmentor DATABASE_URL=postgres://user:secret@localhost/db",
    );
    expect(value).not.toContain("secret");
    expect(value).toContain("postgres://[REDACTED]");
    expect(value).toContain("DATABASE_URL=[REDACTED]");
  });

  it("strips matching single and double quotes only", () => {
    expect(stripQuotes('"value"')).toBe("value");
    expect(stripQuotes("'value'")).toBe("value");
    expect(stripQuotes("value")).toBe("value");
  });
});

describe("waitForPostgres", () => {
  const target = parseDatabaseTarget(localUrl);

  it("retries until the port accepts connections", async () => {
    const connect = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await expect(waitForPostgres(target, { timeoutMs: 50, intervalMs: 1, connect })).resolves.toBe(
      true,
    );
    expect(connect).toHaveBeenCalledTimes(2);
  });

  it("uses the documented readiness defaults", async () => {
    await expect(
      waitForPostgres(target, { connect: vi.fn().mockResolvedValue(true) }),
    ).resolves.toBe(true);
  });

  it("returns false after the bounded timeout", async () => {
    const connect = vi.fn().mockResolvedValue(false);
    await expect(waitForPostgres(target, { timeoutMs: 3, intervalMs: 1, connect })).resolves.toBe(
      false,
    );
    expect(connect).toHaveBeenCalled();
  });

  it("uses the real TCP probe for an unavailable local port", async () => {
    await expect(
      waitForPostgres({ ...target, port: 1 }, { timeoutMs: 5, intervalMs: 1 }),
    ).resolves.toBe(false);
  });

  it("handles successful and timed-out TCP probes", async () => {
    await expect(
      waitForPostgres({ ...target, host: "connect.test" }, { timeoutMs: 5, intervalMs: 1 }),
    ).resolves.toBe(true);
    await expect(
      waitForPostgres({ ...target, host: "timeout.test" }, { timeoutMs: 2, intervalMs: 1 }),
    ).resolves.toBe(false);
  });
});

describe("runInstaller", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("skips installed dependencies and provisions a local target", async () => {
    const command = successfulCommand();
    const options = optionsFor(
      { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${localUrl}` },
      { commandRunner: command.runner },
    );
    const result = await runInstaller(options);
    expect(result).toEqual({ exitCode: 0 });
    expect(command.calls).toEqual([
      { command: "docker", args: ["compose", "up", "-d", "postgres"] },
      { command: "npm", args: ["run", "db:migration:up"] },
    ]);
  });

  it("installs dependencies and creates the environment file on a fresh checkout", async () => {
    const command = successfulCommand();
    const fileSystem = fakeFileSystem({ [examplePath]: `DATABASE_URL=${localUrl}` });
    const result = await runInstaller(
      optionsFor({}, { fileSystem, commandRunner: command.runner }),
    );
    expect(result.exitCode).toBe(0);
    expect(fileSystem.write).toHaveBeenCalledWith(envPath, `DATABASE_URL=${localUrl}`);
    expect(command.calls[0]).toEqual({ command: "npm", args: ["install"] });
  });

  it("uses process environment precedence over a conflicting env file", async () => {
    const command = successfulCommand();
    await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${externalUrl}` },
        { commandRunner: command.runner, env: { DATABASE_URL: localUrl } },
      ),
    );
    expect(command.calls[0]).toEqual({
      command: "docker",
      args: ["compose", "up", "-d", "postgres"],
    });
  });

  it("supports a confirmed external target without starting Docker", async () => {
    const command = successfulCommand();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${externalUrl}` },
        {
          commandRunner: command.runner,
          env: { DATABASE_URL: externalUrl, DEVMENTOR_SETUP_ALLOW_EXTERNAL_DATABASE: "1" },
        },
      ),
    );
    expect(result).toEqual({ exitCode: 0 });
    expect(command.calls).toEqual([{ command: "npm", args: ["run", "db:migration:up"] }]);
  });

  it("prompts for an interactive external target when no opt-in is provided", async () => {
    const command = successfulCommand();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${externalUrl}` },
        {
          commandRunner: command.runner,
          env: { DATABASE_URL: externalUrl },
          stdinIsTTY: true,
        },
      ),
    );
    expect(result.exitCode).toBe(0);
  });

  it("rejects an unconfirmed external target", async () => {
    const command = successfulCommand();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${externalUrl}` },
        {
          commandRunner: command.runner,
          env: { DATABASE_URL: externalUrl },
          stdinIsTTY: false,
        },
      ),
    );
    expect(result).toMatchObject({ exitCode: 1, failedStep: "database target" });
    expect(command.runner).not.toHaveBeenCalled();
  });

  it("stops before mutating dependent state when confirmation is declined", async () => {
    const command = successfulCommand();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${externalUrl}` },
        {
          commandRunner: command.runner,
          env: { DATABASE_URL: externalUrl },
          stdinIsTTY: true,
          confirmExternalDatabase: vi.fn().mockResolvedValue(false),
        },
      ),
    );
    expect(result.failedStep).toBe("database target");
  });

  it("uses Windows command names", async () => {
    const command = successfulCommand();
    await runInstaller(
      optionsFor(
        { [envPath]: `DATABASE_URL=${localUrl}` },
        { commandRunner: command.runner, platform: "win32" },
      ),
    );
    expect(command.calls.map(({ command: name }) => name)).toEqual([
      "npm.cmd",
      "docker.cmd",
      "npm.cmd",
    ]);
  });

  it("reports missing prerequisites and command failures", async () => {
    const writeError = vi.fn();
    const missingExample = await runInstaller(
      optionsFor({ [nodeModules]: "", [packageLock]: "" }, { writeError }),
    );
    expect(missingExample.failedStep).toBe("environment");

    const installFailure = await runInstaller(
      optionsFor(
        {},
        {
          commandRunner: vi.fn(async () => ({ exitCode: 7, signal: null })),
          writeError,
        },
      ),
    );
    expect(installFailure.failedStep).toBe("dependencies");
  });

  it("reports configuration and readiness failures", async () => {
    const missingDatabase = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: "DB_DEBUG=false" },
        { env: {} },
      ),
    );
    expect(missingDatabase.failedStep).toBe("environment");

    const invalidDatabase = await runInstaller(
      optionsFor(
        {
          [nodeModules]: "",
          [packageLock]: "",
          [envPath]: "DATABASE_URL=https://example.test/db",
        },
        { env: {} },
      ),
    );
    expect(invalidDatabase.failedStep).toBe("environment");

    const notReady = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${localUrl}` },
        { readinessCheck: vi.fn(async () => false) },
      ),
    );
    expect(notReady.failedStep).toBe("database readiness");

    const dockerFailure = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${localUrl}` },
        {
          commandRunner: vi.fn(async (name: string): Promise<CommandResult> => ({
            exitCode: name === "docker" ? 1 : 0,
            signal: null,
          })),
        },
      ),
    );
    expect(dockerFailure.failedStep).toBe("database service");
  });

  it("reports migration failures and supports an explicit confirmation callback", async () => {
    const runner = vi.fn(
      async (name: string, args: ReadonlyArray<string>): Promise<CommandResult> => ({
        exitCode: name === "npm" && args[0] === "run" ? 9 : 0,
        signal: null,
      }),
    );
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${externalUrl}` },
        {
          commandRunner: runner,
          env: { DATABASE_URL: externalUrl },
          stdinIsTTY: true,
          confirmExternalDatabase: vi.fn().mockResolvedValue(true),
        },
      ),
    );
    expect(result.failedStep).toBe("migrations");
  });

  it("validates the Node version before touching files", async () => {
    const fileSystem = fakeFileSystem({});
    const result = await runInstaller(optionsFor({}, { nodeVersion: "22.16.9", fileSystem }));
    expect(result.failedStep).toBe("prerequisites");
    expect(fileSystem.exists).not.toHaveBeenCalled();
  });

  it("uses process defaults when the environment seams are omitted", async () => {
    vi.stubEnv("DATABASE_URL", localUrl);
    const command = successfulCommand();
    const result = await runInstaller({
      projectRoot: root,
      fileSystem: fakeFileSystem({
        [nodeModules]: "",
        [packageLock]: "",
        [envPath]: `DATABASE_URL=${localUrl}`,
      }),
      commandRunner: command.runner,
      readinessCheck: vi.fn(async () => true),
      writeOut: vi.fn(),
      writeError: vi.fn(),
    });
    expect(result.exitCode).toBe(0);
    vi.unstubAllEnvs();
  });

  it("accepts a shortened but supported Node version string", async () => {
    const command = successfulCommand();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${localUrl}` },
        { nodeVersion: "23", commandRunner: command.runner },
      ),
    );
    expect(result.exitCode).toBe(0);
  });

  it("pads a two-part Node version", async () => {
    const command = successfulCommand();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: `DATABASE_URL=${localUrl}` },
        { nodeVersion: "22.17", commandRunner: command.runner },
      ),
    );
    expect(result.exitCode).toBe(0);
  });

  it("uses a generic message when URL parsing throws a non-Error value", async () => {
    vi.stubGlobal(
      "URL",
      class {
        constructor() {
          throw "invalid";
        }
      },
    );
    const writeError = vi.fn();
    const result = await runInstaller(
      optionsFor(
        { [nodeModules]: "", [packageLock]: "", [envPath]: "DATABASE_URL=bad" },
        { env: {}, writeError },
      ),
    );
    expect(result.failedStep).toBe("environment");
    expect(writeError).toHaveBeenCalledWith("✗ environment: DATABASE_URL is invalid");
    vi.unstubAllGlobals();
  });

  it("uses the default file system for a fresh temporary fixture", async () => {
    const directory = await mkdtemp(join(tmpdir(), "devmentor-installer-"));
    const fixtureEnv = join(directory, "packages", "app");
    await mkdir(fixtureEnv, { recursive: true });
    await mkdir(join(directory, "node_modules"), { recursive: true });
    await writeFile(join(directory, "node_modules", ".package-lock.json"), "{}");
    await writeFile(join(fixtureEnv, ".env.example"), `DATABASE_URL=${localUrl}`);
    const result = await runInstaller({
      projectRoot: directory,
      env: { DATABASE_URL: localUrl },
      readinessCheck: vi.fn(async () => true),
      commandRunner: successfulCommand().runner,
      writeOut: vi.fn(),
      writeError: vi.fn(),
    });
    expect(result.exitCode).toBe(0);
    await expect(writeFile(join(fixtureEnv, ".env.local"), "changed")).resolves.toBeUndefined();
    await rm(directory, { recursive: true, force: true });
  });
});

describe("runCommand", () => {
  it("forwards child output and handles success, failure, and spawn errors", async () => {
    const success = await runCommand(process.execPath, ["-e", "process.stdout.write('ok')"], {
      cwd: process.cwd(),
      env: process.env,
    });
    expect(success.exitCode).toBe(0);

    const failure = await runCommand(process.execPath, ["-e", "process.exit(2)"], {
      cwd: process.cwd(),
      env: process.env,
    });
    expect(failure.exitCode).toBe(2);

    const stderr = await runCommand(
      process.execPath,
      ["-e", "process.stderr.write('postgres://secret@localhost/db')"],
      { cwd: process.cwd(), env: process.env },
    );
    expect(stderr.exitCode).toBe(0);

    const missing = await runCommand("devmentor-command-does-not-exist", [], {
      cwd: process.cwd(),
      env: process.env,
    });
    expect(missing.exitCode).toBe(1);
  });

  it("forwards termination signals and redacts stderr", async () => {
    const pending = runCommand(
      process.execPath,
      [
        "-e",
        "process.stderr.write('DATABASE_URL=postgres://secret@localhost/db'); setTimeout(() => {}, 1000)",
      ],
      { cwd: process.cwd(), env: process.env },
    );
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.emit("SIGINT");
    const result = await pending;
    expect(result.signal).toBe("SIGINT");

    const pendingTermination = runCommand(process.execPath, ["-e", "setTimeout(() => {}, 1000)"], {
      cwd: process.cwd(),
      env: process.env,
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    process.emit("SIGTERM");
    const terminated = await pendingTermination;
    expect(terminated.signal).toBe("SIGTERM");
  });
});

describe("constants", () => {
  it("keeps the documented readiness bounds", () => {
    expect(READINESS_TIMEOUT_MS).toBe(60_000);
    expect(READINESS_INTERVAL_MS).toBe(500);
  });
});
