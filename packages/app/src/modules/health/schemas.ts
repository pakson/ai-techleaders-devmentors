import { z } from "zod";

export const HealthDto = z.object({ status: z.literal("ok") });
export type HealthDto = z.infer<typeof HealthDto>;
