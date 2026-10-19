// Minimal driver for the agent-browser CLI: one command per call, JSON in, JSON out.
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Evidence directory of the e2e run (uploaded by CI). */
export const evidenceDir = fileURLToPath(new URL("../../../test-results/e2e", import.meta.url));

interface CommandResult {
  readonly success: boolean;
  readonly data: Record<string, unknown> | null;
  readonly error: string | null;
}

/** Runs one agent-browser command in a dedicated session and returns its `data`. Throws on failure. */
export async function browser(...args: string[]): Promise<Record<string, unknown>> {
  const session = process.env.AGENT_BROWSER_SESSION ?? "e2e";
  const { stdout } = await run("agent-browser", ["--session", session, "--json", ...args], {
    timeout: 30_000,
  }).catch((error: { stdout?: string; message: string }) => {
    if (error.stdout) return { stdout: error.stdout };
    throw error;
  });
  const result = JSON.parse(stdout) as CommandResult;
  if (!result.success || !result.data) {
    throw new Error(`agent-browser ${args.join(" ")} failed: ${result.error}`);
  }
  return result.data;
}

/** Saves a full-page screenshot of the current page as `<evidenceDir>/screenshots/<name>.png`. */
export async function screenshot(name: string): Promise<void> {
  const file = `${evidenceDir}/screenshots/${name.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.png`;
  await browser("screenshot", "--full", file);
}

/** Visible text of the first element matching `selector`. */
export async function getText(selector: string): Promise<string> {
  const data = await browser("get", "text", selector);
  return String(data.text);
}
