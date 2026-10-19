import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `server-only` throws outside the React Server bundle; tests import server modules directly.
const serverOnly = fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url));

// Integration and e2e tests run against TEST_DATABASE_URL (never the dev/shared database).
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const testEnv: Record<string, string> = testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {};

export default defineConfig({
  resolve: { tsconfigPaths: true, alias: { "server-only": serverOnly } },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/*/src/**/__tests__/**/*.test.ts"],
          exclude: ["**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "int",
          include: ["packages/*/src/**/__tests__/**/*.int.test.ts"],
          globalSetup: ["packages/db/src/__tests__/migrate-test-db.ts"],
          env: testEnv,
          fileParallelism: false,
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["packages/app/e2e/**/*.e2e.test.ts"],
          globalSetup: [
            "packages/db/src/__tests__/migrate-test-db.ts",
            "packages/app/e2e/global-setup.ts",
          ],
          env: testEnv,
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
