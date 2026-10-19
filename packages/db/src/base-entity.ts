import { p } from "@mikro-orm/postgresql";
import { uuidv7 } from "uuidv7";

/**
 * Standard columns for every entity: a UUIDv7 primary key generated in the app (time-ordered, so
 * indexes stay compact) and `created_at` / `updated_at` timestamps (`timestamptz`).
 * Spread into `defineEntity({ properties: { ...baseProperties(), ... } })`.
 */
export function baseProperties() {
  return {
    id: p
      .uuid()
      .primary()
      .onCreate(() => uuidv7()),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  };
}
