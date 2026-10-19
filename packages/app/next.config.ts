import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal @devmentor/* packages ship TypeScript source; Turbopack transpiles workspace
  // packages automatically, so they don't need to be listed in `transpilePackages`.

  // Keep the ORM and its driver out of the server bundle (loaded with Node's `require`).
  // `@mikro-orm/core` and `pg` are already on Next.js's built-in list.
  serverExternalPackages: ["@mikro-orm/postgresql", "@mikro-orm/sql", "@mikro-orm/migrations"],
};

export default nextConfig;
