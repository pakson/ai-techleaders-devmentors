// Shared Zod primitives. Isomorphic: no server-only imports, safe to use in client components.
import { z } from "zod";

export const Uuid = z.uuid();

/** ISO 8601 timestamp on the wire, `Date` in code. Decode parses the string, encode formats it. */
export const IsoDateTime = z.codec(z.iso.datetime({ offset: true }), z.date(), {
  decode: (value) => new Date(value),
  encode: (date) => date.toISOString(),
});

export const SortOrder = z.enum(["asc", "desc"]);

/** List query (`?page=2&pageSize=50&sort=createdAt&order=desc&q=ada`). */
export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().min(1).optional(),
  order: SortOrder.default("asc"),
  q: z.string().trim().min(1).optional(),
});
export type PaginationQuery = z.infer<typeof PaginationQuery>;

/** List response envelope: `{ items, total, page, pageSize }`. */
export function listResponse<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
  });
}
