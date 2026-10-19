import { assert, describe, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { z } from "zod";

import { ValidationError } from "../errors";
import { IsoDateTime, PaginationQuery, listResponse } from "../schemas";
import { decode, encode } from "../validation";

const Input = z.object({ name: z.string().min(1) });

describe("decode", () => {
  it.effect("returns the parsed value", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* decode(Input, { name: "Ada", extra: 1 }), { name: "Ada" });
    }),
  );

  it.effect("fails with ValidationError and field errors", () =>
    Effect.gen(function* () {
      const error = yield* decode(Input, { name: "" }).pipe(Effect.flip);
      assert.instanceOf(error, ValidationError);
      assert.isDefined(error.issues.fieldErrors["name"]);
    }),
  );
});

describe("encode", () => {
  const Dto = z.object({ id: z.string(), createdAt: IsoDateTime });

  it.effect("strips undeclared fields and applies codecs", () =>
    Effect.gen(function* () {
      const value = { id: "1", createdAt: new Date("2026-10-19T10:00:00.000Z"), password: "x" };
      assert.deepStrictEqual(yield* encode(Dto, value), {
        id: "1",
        createdAt: "2026-10-19T10:00:00.000Z",
      });
    }),
  );

  it.effect("dies when the value doesn't match", () =>
    Effect.gen(function* () {
      const exit = yield* encode(Dto, { id: 1 } as never).pipe(Effect.exit);
      assert.isTrue(Exit.isFailure(exit));
    }),
  );
});

describe("shared schemas", () => {
  it("applies pagination defaults and coerces query strings", () => {
    assert.deepStrictEqual(PaginationQuery.parse({}), { page: 1, pageSize: 20, order: "asc" });
    assert.strictEqual(PaginationQuery.parse({ page: "3", pageSize: "50" }).page, 3);
    assert.isFalse(PaginationQuery.safeParse({ pageSize: "101" }).success);
  });

  it("builds the list envelope", () => {
    const List = listResponse(z.object({ id: z.string() }));
    const list = { items: [{ id: "a" }], total: 1, page: 1, pageSize: 20 };
    assert.deepStrictEqual(List.parse(list), list);
  });

  it("decodes an ISO timestamp to a Date", () => {
    const date = IsoDateTime.decode("2026-10-19T12:00:00.000Z");
    assert.instanceOf(date, Date);
    assert.strictEqual(date.toISOString(), "2026-10-19T12:00:00.000Z");
  });
});
