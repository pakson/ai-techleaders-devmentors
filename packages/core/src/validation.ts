import { Effect } from "effect";
import { z } from "zod";

import { ValidationError } from "./errors";

/** Decodes untrusted input with a Zod schema. Fails with `ValidationError` (400). */
export function decode<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): Effect.Effect<z.output<Schema>, ValidationError> {
  return Effect.suspend(() => {
    const result = schema.safeParse(input);
    if (result.success) return Effect.succeed(result.data);
    return Effect.fail(
      new ValidationError({ message: "Invalid input", issues: z.flattenError(result.error) }),
    );
  });
}

/**
 * Encodes a value through a response schema (unknown keys stripped, codecs such as `IsoDateTime`
 * applied), so only declared fields reach the client. A mismatch is a bug, so it's a defect.
 */
export function encode<Schema extends z.ZodType>(
  schema: Schema,
  value: z.output<Schema>,
): Effect.Effect<z.input<Schema>> {
  return Effect.suspend(() => {
    const result = z.safeEncode(schema, value);
    return result.success ? Effect.succeed(result.data) : Effect.die(result.error);
  });
}
