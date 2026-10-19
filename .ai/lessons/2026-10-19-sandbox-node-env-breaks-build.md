# Sandbox exports NODE_ENV=development, which breaks `next build`

- Date: 2026-10-19
- Context: monorepo setup (spec 2026-10-19-monorepo-architecture)

## Finding
The sandbox shell has `NODE_ENV=development` set. `next build` then warns "non-standard NODE_ENV" and fails while prerendering `/_global-error` with `TypeError: Cannot read properties of null (reading 'useContext')`. It looks like a duplicate React, but it isn't.

## Resolution
Run the build with `NODE_ENV=production npm run build`. The scripts in `package.json` stay portable (no inline env).

## Rule going forward
If `next build` fails with a `useContext` of null during prerender, first check `echo $NODE_ENV`, and build with `NODE_ENV=production`.
