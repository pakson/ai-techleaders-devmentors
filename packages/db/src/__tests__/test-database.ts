// Vitest globalSetup for `npm run test:int` and `test:e2e`: provides an ephemeral, migrated
// database. Uses TEST_DATABASE_URL when set; otherwise starts PostgreSQL with Testcontainers
// (needs Docker) and stops it after the run.
import { MikroORM } from "@mikro-orm/postgresql";
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

async function migrate(url: string): Promise<void> {
  // The CLI config reads DATABASE_URL; real env vars win over the .env files it loads.
  process.env.DATABASE_URL = url;
  const { default: config } = await import("../mikro-orm.config");
  const orm = await MikroORM.init(config);
  try {
    await orm.migrator.up();
  } finally {
    await orm.close();
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  let container: StartedPostgreSqlContainer | undefined;
  let url = process.env.TEST_DATABASE_URL;

  if (url) {
    if (url === process.env.DATABASE_URL) {
      throw new Error(
        "TEST_DATABASE_URL must not point at DATABASE_URL (tests write and delete data)",
      );
    }
  } else {
    container = await new PostgreSqlContainer("postgres:17").start();
    url = container.getConnectionUri();
    // Later global setups (the e2e server) read it from the environment.
    process.env.TEST_DATABASE_URL = url;
  }

  await migrate(url);
  project.provide("databaseUrl", url);

  return async () => {
    await container?.stop();
  };
}
