import { randomUUID } from "node:crypto";
import { defineEntity, p } from "@mikro-orm/postgresql";

// Example entity. Entities use `defineEntity` (no decorators), so they work unchanged under
// Turbopack/SWC, the MikroORM CLI and plain Node.
const UserSchema = defineEntity({
  name: "User",
  tableName: "users",
  properties: {
    id: p.uuid().primary().onCreate(() => randomUUID()),
    email: p.string().length(320).unique(),
    name: p.string(),
    createdAt: p.datetime().onCreate(() => new Date()),
    updatedAt: p
      .datetime()
      .onCreate(() => new Date())
      .onUpdate(() => new Date()),
  },
});

export class User extends UserSchema.class {}
UserSchema.setClass(User);
