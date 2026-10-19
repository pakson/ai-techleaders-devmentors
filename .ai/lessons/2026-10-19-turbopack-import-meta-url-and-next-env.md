# Turbopack bundles `new URL(..., import.meta.url)`; `@next/env` is CommonJS

- Date: 2026-10-19
- Context: MikroORM config in packages/db

## Finding
1. `new URL("./migrations", import.meta.url)` in code reachable from the Next.js app makes Turbopack try to resolve it as an asset ("Module not found: Can't resolve './migrations'").
2. `import { loadEnvConfig } from "@next/env"` fails in native ESM (the MikroORM CLI via tsx), because `@next/env` is CommonJS without named ESM exports.

## Resolution
1. File-system paths (migrations folder) live only in the CLI-only `packages/db/src/mikro-orm.config.ts`. The runtime `createOrmConfig()` has none.
2. Use `import nextEnv from "@next/env"; nextEnv.loadEnvConfig(dir)`.

## Rule going forward
Keep `import.meta.url`-based paths out of modules the app bundles. Use the default import for CommonJS packages in ESM CLI code.
