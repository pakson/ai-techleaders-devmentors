import { HealthService } from "@/modules/health/health-service";
import { HealthDto } from "@/modules/health/schemas";
import { effectRoute } from "@/server/effect-route";

export const GET = effectRoute({ response: HealthDto }, () =>
  HealthService.use((health) => health.check()),
);
