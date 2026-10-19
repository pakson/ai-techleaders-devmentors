// Vitest setupFile for `test:int` / `test:e2e`: points each test worker at the database provided
// by `test-database.ts`, never at the shell's DATABASE_URL.
import { inject } from "vitest";

process.env.DATABASE_URL = inject("databaseUrl");
