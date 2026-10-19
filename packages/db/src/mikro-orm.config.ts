// MikroORM CLI entry point (`npm run db:migration:*`). Not imported by the Next.js app, which keeps
// the Migrator (and file-system paths Turbopack would try to bundle) out of the server build.
import nextEnv from "@next/env"; // CommonJS package: use the default import
import { Migrator } from "@mikro-orm/migrations";
import { fileURLToPath } from "node:url";

// Same .env files as the app (they live in packages/app).
nextEnv.loadEnvConfig(fileURLToPath(new URL("../../app", import.meta.url)));

const { createOrmConfig } = await import("./config");

export default createOrmConfig({
  extensions: [Migrator],
  migrations: {
    tableName: "mikro_orm_migrations",
    path: fileURLToPath(new URL("./migrations", import.meta.url)),
    glob: "!(*.d).{js,ts}",
    transactional: true,
    emit: "ts",
    // Fixed name, so the snapshot does not depend on the database name of the current environment.
    snapshotName: ".snapshot",
  },
});
