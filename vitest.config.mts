import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// `server-only` throws outside the React Server bundle; tests import server modules directly.
const serverOnly = fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url));

// Integration and e2e tests get an ephemeral, migrated database (TEST_DATABASE_URL or a
// Testcontainers PostgreSQL), never the dev/shared one.
const testDatabase = {
  globalSetup: ["packages/db/src/__tests__/test-database.ts"],
  setupFiles: ["packages/db/src/__tests__/use-test-database.ts"],
};

export default defineConfig({
  resolve: { tsconfigPaths: true, alias: { "server-only": serverOnly } },
  test: {
    // `npm test` fails unless the unit tests cover every line and branch of the source.
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.{ts,tsx}"],
      // Generated migrations are exercised by `test:int` / `test:e2e`, not unit tests.
      exclude: ["**/__tests__/**", "packages/db/src/migrations/**"],
      reporter: ["text", "html"],
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["packages/*/src/**/__tests__/**/*.test.{ts,tsx}"],
          exclude: ["**/*.int.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "int",
          include: ["packages/*/src/**/__tests__/**/*.int.test.ts"],
          ...testDatabase,
          fileParallelism: false,
          hookTimeout: 120_000,
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["packages/app/e2e/**/*.e2e.test.ts"],
          globalSetup: [...testDatabase.globalSetup, "packages/app/e2e/global-setup.ts"],
          setupFiles: testDatabase.setupFiles,
          fileParallelism: false,
          testTimeout: 60_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
