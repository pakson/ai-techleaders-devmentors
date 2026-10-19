import { createRequestScope } from "@/di/container";

export async function GET() {
  try {
    const scope = await createRequestScope();
    const health = await scope.cradle.healthService.check();
    return Response.json(health, { status: health.status === "ok" ? 200 : 503 });
  } catch (error) {
    // Container/ORM init failed (e.g. DATABASE_URL missing, database unreachable).
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ status: "error", error: message }, { status: 503 });
  }
}
