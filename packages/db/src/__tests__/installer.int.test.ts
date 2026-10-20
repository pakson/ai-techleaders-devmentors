import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import {
  runCommand,
  runInstaller,
  waitForPostgres,
  type CommandOptions,
  type CommandResult,
} from "@devmentor/core/setup";

import { User } from "../entities";

const example = "DATABASE_URL=postgres://devmentor:devmentor@localhost:5432/devmentor\n";

describe("installer disposable database smoke check", () => {
  it("runs setup twice while preserving a row and the migration ledger", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("test database setup did not provide DATABASE_URL");

    const projectRoot = await mkdtemp(join(tmpdir(), "devmentor-installer-int-"));
    const appDirectory = join(projectRoot, "packages", "app");
    await mkdir(appDirectory, { recursive: true });
    await mkdir(join(projectRoot, "node_modules"), { recursive: true });
    await writeFile(join(projectRoot, "node_modules", ".package-lock.json"), "{}");
    await writeFile(join(appDirectory, ".env.example"), example);

    const repoRoot = resolve(process.cwd());
    const runMigrationCommand = async (
      command: string,
      args: ReadonlyArray<string>,
      options: CommandOptions,
    ): Promise<CommandResult> => {
      if (command !== "npm" || args.join(" ") !== "run db:migration:up") {
        return { exitCode: 0, signal: null };
      }
      return runCommand("npm", [...args], { cwd: repoRoot, env: options.env });
    };

    const runSetup = () =>
      runInstaller({
        projectRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
          DEVMENTOR_SETUP_ALLOW_EXTERNAL_DATABASE: "1",
        },
        commandRunner: runMigrationCommand,
        readinessCheck: waitForPostgres,
        writeOut: () => undefined,
        writeError: () => undefined,
      });

    try {
      const first = await runSetup();
      expect(first).toEqual({ exitCode: 0 });
      const createdEnv = await readFile(join(appDirectory, ".env.local"), "utf8");
      expect(createdEnv).toBe(example);

      const { default: config } = await import("../mikro-orm.config");
      const orm = await MikroORM.init(config);
      const em = orm.em.fork();
      const email = `installer-${Date.now()}@example.com`;
      const user = em.create(User, { email, name: "Installer smoke" });
      await em.flush();
      const migrationsBefore = (await orm.migrator.getExecuted()).map(
        (migration) => migration.name,
      );

      const second = await runSetup();
      expect(second).toEqual({ exitCode: 0 });
      const found = await em.findOne(User, { email });
      const migrationsAfter = (await orm.migrator.getExecuted()).map((migration) => migration.name);
      expect(found?.name).toBe("Installer smoke");
      expect(migrationsAfter).toEqual(migrationsBefore);

      await em.nativeDelete(User, { id: user.id });
      await orm.close(true);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
