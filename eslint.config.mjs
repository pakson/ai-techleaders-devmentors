import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const restrictImports = (...patterns) => ({ "no-restricted-imports": ["error", { patterns }] });

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    settings: {
      // The Next.js app lives in a workspace package, not at the repo root.
      next: { rootDir: "packages/app/" },
    },
  },
  {
    files: ["**/*.{ts,tsx,mts}"],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ["*.mts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSEnumDeclaration",
          message: "Use a string-literal union or `as const` object.",
        },
      ],
    },
  },
  // Import workspace packages by name (@devmentor/...), never through relative paths.
  { files: ["packages/**/*.{ts,tsx}"], rules: { "import/no-relative-packages": "error" } },
  // Package boundaries: app → ui, db, core; db → core; core and ui import no internal package.
  {
    files: ["packages/core/src/**/*.ts"],
    rules: restrictImports({
      group: ["@devmentor/*", "next", "next/*", "react", "react/*", "@mikro-orm/*"],
      message: "@devmentor/core is framework-agnostic: no internal packages, Next, React or ORM.",
    }),
  },
  {
    files: ["packages/db/src/**/*.ts"],
    rules: restrictImports({
      group: [
        "@devmentor/app",
        "@devmentor/app/*",
        "@devmentor/ui",
        "@devmentor/ui/*",
        "next",
        "next/*",
        "react",
      ],
      message: "@devmentor/db depends only on @devmentor/core.",
    }),
  },
  {
    files: ["packages/ui/src/**/*.{ts,tsx}"],
    rules: restrictImports({
      group: [
        "@devmentor/app",
        "@devmentor/app/*",
        "@devmentor/core",
        "@devmentor/core/*",
        "@devmentor/db",
        "@devmentor/db/*",
        "effect",
        "effect/*",
        "zod",
      ],
      message: "@devmentor/ui is presentational: no internal packages, Effect or Zod.",
    }),
  },
  // Modules talk to each other only through their schemas, errors and service tags.
  // Inside a module, use relative imports.
  {
    files: ["packages/app/src/modules/**/*.{ts,tsx}"],
    rules: restrictImports({
      group: [
        "@/modules/*/*",
        "!@/modules/*/schemas",
        "!@/modules/*/errors",
        "!@/modules/*/*-service",
      ],
      message: "Import another module only through its schemas, errors or service tag.",
    }),
  },
  // Server code logs through Effect (`Effect.log*`), never `console`.
  {
    files: [
      "packages/core/src/**/*.ts",
      "packages/db/src/**/*.ts",
      "packages/app/src/{server,modules}/**/*.ts",
    ],
    rules: {
      "no-console": "error",
      // Effect's `Service.use(...)` is not a React hook.
      "react-hooks/rules-of-hooks": "off",
    },
  },
  globalIgnores(["**/.next/**", "**/out/**", "**/build/**", "**/next-env.d.ts"]),
]);

export default eslintConfig;
