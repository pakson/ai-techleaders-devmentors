import { randomUUID } from "node:crypto";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { Migrator } from "@mikro-orm/migrations";
import { MikroORM } from "@mikro-orm/postgresql";
import { describe, expect, it } from "vitest";

import {
  parseDatabaseTarget,
  runCommand,
  runInstaller,
  waitForPostgres,
  type CommandOptions,
  type CommandResult,
} from "@devmentor/core/setup";

describe("installer disposable database smoke check", () => {
  it("pins the confirmed target and applies fresh and later migrations exactly once", async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("test database setup did not provide DATABASE_URL");

    const projectRoot = await mkdtemp(join(tmpdir(), "devmentor-installer-int-"));
    const appDirectory = join(projectRoot, "packages", "app");
    const migrationsDirectory = join(projectRoot, "migrations");
    const configPath = join(projectRoot, "mikro-orm.config.mts");
    const repoRoot = resolve(process.cwd());
    const schema = `installer_${randomUUID().replaceAll("-", "")}`;
    const example = `DATABASE_URL=${databaseUrl}\n`;
    const env: NodeJS.ProcessEnv = { ...process.env, DEVMENTOR_SETUP_ALLOW_EXTERNAL_DATABASE: "1" };
    env.MIKRO_ORM_HOST = "unconfirmed.invalid";
    env.MIKRO_ORM_PORT = "1";
    env.MIKRO_ORM_DB_NAME = "unconfirmed";
    env.MIKRO_ORM_CLIENT_URL = "postgres://fake:fake@unconfirmed.invalid:1/shared";
    delete env.DATABASE_URL;
    delete env.__NEXT_PROCESSED_ENV;
    let migrationRuns = 0;
    let orm: MikroORM | undefined;

    try {
      await mkdir(appDirectory, { recursive: true });
      await mkdir(migrationsDirectory);
      await symlink(join(repoRoot, "node_modules"), join(projectRoot, "node_modules"), "junction");
      await writeFile(join(appDirectory, ".env.example"), example);
      // The real migration loader would select this unconfirmed target without a pinned URL.
      await writeFile(
        join(appDirectory, ".env.production.local"),
        "DATABASE_URL=postgres://fake:fake@unconfirmed.invalid:1/shared\n",
      );
      await writeFile(
        configPath,
        `import nextEnv from "@next/env";
import { defineConfig } from "@mikro-orm/postgresql";
import { Migrator } from "@mikro-orm/migrations";
nextEnv.loadEnvConfig(${JSON.stringify(appDirectory)});
export default defineConfig({
  clientUrl: process.env.DATABASE_URL,
  entities: [],
  discovery: { warnWhenNoEntities: false },
  schema: ${JSON.stringify(schema)},
  extensions: [Migrator],
  migrations: { path: ${JSON.stringify(migrationsDirectory)}, glob: "*.js", snapshot: false },
});
`,
      );
      const writeMigration = (name: string, sql: string) =>
        writeFile(
          join(migrationsDirectory, `${name}.js`),
          `import { Migration } from "@mikro-orm/migrations";
export class ${name} extends Migration {
  async up() { this.addSql(${JSON.stringify(sql)}); }
}
`,
        );
      await writeMigration(
        "Migration202610200001",
        `create table "${schema}"."sentinel" (id integer primary key, value text not null)`,
      );

      orm = await MikroORM.init({
        clientUrl: databaseUrl,
        entities: [],
        discovery: { warnWhenNoEntities: false },
        schema,
        extensions: [Migrator],
        migrations: { path: migrationsDirectory, glob: "*.js", snapshot: false },
      });
      const testOrm = orm;
      const connection = testOrm.em.getConnection();
      const runMigrationCommand = async (
        command: string,
        args: ReadonlyArray<string>,
        options: CommandOptions,
      ): Promise<CommandResult> => {
        if (command === "npm" && args.join(" ") === "install") {
          // Dependencies exist; this smoke check exercises the real migration command boundary.
          return { exitCode: 0, signal: null };
        }
        expect(command).toBe("npm");
        expect(args).toEqual(["run", "db:migration:up"]);
        // Assert before spawning so a regression cannot connect to the conflicting target.
        expect(options.env.DATABASE_URL).toBe(databaseUrl);
        const target = parseDatabaseTarget(databaseUrl);
        expect(options.env).toMatchObject({
          MIKRO_ORM_CLIENT_URL: databaseUrl,
          MIKRO_ORM_HOST: target.host,
          MIKRO_ORM_PORT: String(target.port),
          MIKRO_ORM_DB_NAME: target.database,
        });
        migrationRuns += 1;
        return runCommand(command, args, {
          cwd: repoRoot,
          env: { ...options.env, NODE_ENV: "production", MIKRO_ORM_CLI_CONFIG: configPath },
        });
      };
      const runSetup = () =>
        runInstaller({
          projectRoot,
          env,
          commandRunner: runMigrationCommand,
          readinessCheck: waitForPostgres,
          writeOut: () => undefined,
          writeError: () => undefined,
        });

      expect(await orm.migrator.getExecuted()).toEqual([]);
      expect(await runSetup()).toEqual({ exitCode: 0 });
      expect(await readFile(join(appDirectory, ".env.local"), "utf8")).toBe(example);
      await connection.execute(`insert into "${schema}"."sentinel" values (1, 'preserved')`);
      const ledger = async () =>
        (await testOrm.migrator.getExecuted()).map((migration) => migration.name);
      expect(await ledger()).toEqual(["Migration202610200001"]);

      expect(await runSetup()).toEqual({ exitCode: 0 });
      expect(await ledger()).toEqual(["Migration202610200001"]);
      expect(await readFile(join(appDirectory, ".env.local"), "utf8")).toBe(example);

      await writeMigration(
        "Migration202610200002",
        `alter table "${schema}"."sentinel" add column later boolean not null default true`,
      );
      expect(await runSetup()).toEqual({ exitCode: 0 });
      expect(await ledger()).toEqual(["Migration202610200001", "Migration202610200002"]);
      expect(await connection.execute(`select * from "${schema}"."sentinel"`)).toEqual([
        { id: 1, value: "preserved", later: true },
      ]);
      expect(migrationRuns).toBe(3);
    } finally {
      if (orm) {
        try {
          await orm.em.getConnection().execute(`drop schema if exists "${schema}" cascade`);
        } finally {
          await orm.close(true);
        }
      }
      await rm(projectRoot, { recursive: true, force: true });
    }
  }, 60_000);
});
