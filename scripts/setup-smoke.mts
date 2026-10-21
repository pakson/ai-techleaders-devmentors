// Dependency-free CLI evidence: run on the minimum Node version and Windows in CI.
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");

await test("the real setup CLI bootstraps without dependencies and preserves the validated target", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "devmentor-cli-"));
  const server = createServer((socket) => socket.end());
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    const url = `postgres://fixture:fixture@127.0.0.1:${address.port}/installer`;
    for (const directory of ["scripts", "packages/core/src/setup", "packages/app"]) {
      await mkdir(join(fixture, directory), { recursive: true });
    }
    await copyFile(join(repository, "scripts/setup.mts"), join(fixture, "scripts/setup.mts"));
    await copyFile(
      join(repository, "packages/core/src/setup/installer.ts"),
      join(fixture, "packages/core/src/setup/installer.ts"),
    );
    await writeFile(join(fixture, "packages/app/.env.example"), `DATABASE_URL=${url}\n`);
    await writeFile(
      join(fixture, "packages/app/.env.production.local"),
      "DATABASE_URL=postgres://unconfirmed.invalid/unconfirmed\n",
    );
    const npmEntry = join(fixture, "npm-cli.cjs");
    await writeFile(
      npmEntry,
      `
      const fs = require('node:fs');
      fs.appendFileSync('commands.log', process.argv.slice(2).join(' ') + '\\n');
      if (process.argv[2] === 'install') fs.mkdirSync('node_modules', { recursive: true });
      else if (process.env.DATABASE_URL !== ${JSON.stringify(url)} || process.env.MIKRO_ORM_HOST !== '127.0.0.1' || process.env.MIKRO_ORM_PORT !== '${address.port}' || process.env.MIKRO_ORM_DB_NAME !== 'installer' || process.env.MIKRO_ORM_CLIENT_URL !== ${JSON.stringify(url)}) process.exit(9);
    `,
    );
    const env = {
      ...process.env,
      npm_execpath: npmEntry,
      DEVMENTOR_SETUP_ALLOW_EXTERNAL_DATABASE: "1",
    };
    delete env.DATABASE_URL;
    const invoke = () =>
      new Promise<string>((resolve, reject) => {
        const child = spawn(process.execPath, ["--experimental-strip-types", "scripts/setup.mts"], {
          cwd: fixture,
          env,
          shell: false,
        });
        let output = "";
        child.stdout.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        child.stderr.on("data", (chunk: Buffer) => {
          output += chunk.toString();
        });
        child.once("error", reject);
        child.once("close", (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
      });
    assert.match(await invoke(), /npm run dev/);
    const contents = await readFile(join(fixture, "packages/app/.env.local"), "utf8");
    assert.equal(contents, `DATABASE_URL=${url}\n`);
    assert.match(await invoke(), /preserved/);
    assert.equal(await readFile(join(fixture, "packages/app/.env.local"), "utf8"), contents);
    assert.equal(
      await readFile(join(fixture, "commands.log"), "utf8"),
      "install\nrun db:migration:up\ninstall\nrun db:migration:up\n",
    );
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(fixture, { recursive: true, force: true });
  }
});
