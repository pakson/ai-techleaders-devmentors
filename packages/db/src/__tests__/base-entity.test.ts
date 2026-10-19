import { describe, expect, it } from "vitest";

import { baseProperties } from "../base-entity";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// The generators MikroORM calls when an entity is created or updated.
type Generator = () => unknown;
const hook = (property: object, name: "onCreate" | "onUpdate") =>
  (property as { "~options": Record<string, Generator> })["~options"][name] as Generator;

describe("baseProperties", () => {
  it("generates a UUIDv7 primary key", () => {
    const { id } = baseProperties();
    expect(id["~options"].primary).toBe(true);
    expect(hook(id, "onCreate")()).toMatch(UUID_V7);
  });

  it("sets createdAt on create and updatedAt on create and update", () => {
    const { createdAt, updatedAt } = baseProperties();
    expect(hook(createdAt, "onCreate")()).toBeInstanceOf(Date);
    expect(hook(updatedAt, "onCreate")()).toBeInstanceOf(Date);
    expect(hook(updatedAt, "onUpdate")()).toBeInstanceOf(Date);
  });
});
