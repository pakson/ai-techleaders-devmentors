import { defineEntity, p } from "@mikro-orm/postgresql";

import { baseProperties } from "../base-entity";

// Example entity. Entities use `defineEntity` (no decorators), so they work unchanged under
// Turbopack/SWC, the MikroORM CLI and plain Node.
const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    ...baseProperties(),
    email: p.string().length(320).unique(),
    name: p.string(),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
