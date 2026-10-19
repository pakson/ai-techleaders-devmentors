import { Badge } from "@devmentor/ui/components/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@devmentor/ui/components/card";
import { Effect, Exit } from "effect";
import { connection } from "next/server";

import { HealthService } from "@/modules/health/health-service";
import { runRequest } from "@/server/run-request";

export const metadata = { title: "Dashboard" };

export default async function BackendDashboardPage() {
  // Render at request time: the database status must not be baked in at build.
  await connection();
  const exit = await runRequest(
    Effect.gen(function* () {
      const health = yield* HealthService;
      return yield* health.check();
    }),
  );
  const connected = Exit.isSuccess(exit);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Database
            <Badge variant={connected ? "default" : "destructive"}>
              {connected ? "Connected" : "Unavailable"}
            </Badge>
          </CardTitle>
          <CardDescription>PostgreSQL via MikroORM, checked by an Effect service.</CardDescription>
        </CardHeader>
        {!connected && (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The database check failed. Details are in the server log.
            </p>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
