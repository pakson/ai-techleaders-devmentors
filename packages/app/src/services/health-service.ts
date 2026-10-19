import type { DbCradle } from "@devmentor/db";

export type HealthStatus = { status: "ok" } | { status: "error"; error: string };

/** Example service resolved from the container; checks that the database is reachable. */
export class HealthService {
  private readonly em: DbCradle["em"];

  constructor({ em }: Pick<DbCradle, "em">) {
    this.em = em;
  }

  async check(): Promise<HealthStatus> {
    try {
      await this.em.execute("select 1");
      return { status: "ok" };
    } catch (error) {
      return { status: "error", error: error instanceof Error ? error.message : String(error) };
    }
  }
}
