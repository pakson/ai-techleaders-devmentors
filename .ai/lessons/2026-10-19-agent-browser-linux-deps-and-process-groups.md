# agent-browser needs system libraries on Linux; kill the e2e server's process group

- Date: 2026-10-19
- Context: engineering-standards implementation, first e2e smoke test

## Finding
1. `npx agent-browser install` downloads Chrome, but in the sandbox Chrome exited with `libnspr4.so: cannot open shared object file` (exit 127). npm also blocks the package's postinstall script, so nothing is installed automatically.
2. The e2e global setup spawned `npx next start`. `child.kill()` only killed `npx`; the `next-server` child kept running (orphaned) and held the inherited stdout pipe open, so `npm run test:e2e | tail` never returned even though all tests passed.

## Resolution
1. `npx agent-browser install --with-deps` installs Chrome plus the system libraries.
2. Spawn the server with `detached: true` and stop it with `process.kill(-pid, "SIGTERM")` (whole process group).

## Rule going forward
On a new Linux machine, run `npx agent-browser install --with-deps` before e2e tests. Any test setup that spawns a server through `npx`/`npm` must kill the process group, not just the child.
