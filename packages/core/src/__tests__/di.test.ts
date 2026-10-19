import { describe, expect, it } from "vitest";

import { asFunction, asValue, createAppContainer, type ContainerModule } from "../di";

interface Cradle {
  greeting: string;
  scoped: { readonly id: number };
  singleton: string;
}

describe("createAppContainer", () => {
  it("creates an empty container by default", () => {
    expect(Object.keys(createAppContainer().registrations)).toEqual([]);
  });

  it("applies every module and injects dependencies from the cradle", () => {
    const greeting: ContainerModule<Cradle> = (container) =>
      container.register({ greeting: asValue("hello") });
    const singleton: ContainerModule<Cradle> = (container) =>
      container.register({
        singleton: asFunction(({ greeting }: Cradle) => `${greeting} world`).singleton(),
      });
    const container = createAppContainer<Cradle>([greeting, singleton]);
    expect(container.resolve("singleton")).toBe("hello world");
  });

  it("is strict: a singleton can't depend on a scoped registration", () => {
    let next = 0;
    const container = createAppContainer<Cradle>([
      (c) =>
        c.register({
          scoped: asFunction(() => ({ id: next++ })).scoped(),
          singleton: asFunction(({ scoped }: Cradle) => String(scoped.id)).singleton(),
        }),
    ]);
    expect(() => container.resolve("singleton")).toThrow(/lifetime/i);
  });
});
