import { Badge } from "@devmentor/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@devmentor/ui/components/card";
import { connection } from "next/server";

import { createRequestScope } from "@/di/container";
import type { HealthStatus } from "@/services/health-service";

export const metadata = { title: "Dashboard" };

async function getHealth(): Promise<HealthStatus> {
  try {
    const scope = await createRequestScope();
    return await scope.cradle.healthService.check();
  } catch (error) {
    return { status: "error", error: error instanceof Error ? error.message : String(error) };
  }
}

export default async function BackendDashboardPage() {
  // Render at request time: the database status must not be baked in at build.
  await connection();
  const health = await getHealth();

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Database
            <Badge variant={health.status === "ok" ? "default" : "destructive"}>
              {health.status === "ok" ? "Connected" : "Unavailable"}
            </Badge>
          </CardTitle>
          <CardDescription>PostgreSQL via MikroORM, resolved through the Awilix container.</CardDescription>
        </CardHeader>
        {health.status === "error" && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{health.error}</p>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
