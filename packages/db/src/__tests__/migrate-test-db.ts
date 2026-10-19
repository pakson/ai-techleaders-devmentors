// Vitest globalSetup for `npm run test:int` and `test:e2e`: applies all migrations to TEST_DATABASE_URL.
import { MikroORM } from "@mikro-orm/postgresql";

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is required for integration tests");
  if (url === process.env.DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL must not point at DATABASE_URL (tests write and delete data)",
    );
  }
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
