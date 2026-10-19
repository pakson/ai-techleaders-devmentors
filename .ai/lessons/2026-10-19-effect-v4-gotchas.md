# Effect 4 gotchas: service access, hooks lint, language-service diagnostics

- Date: 2026-10-19
- Context: engineering-standards implementation (Effect 4.0.5)

## Finding
1. Effect 4 `Context.Service` classes have no static `asEffect()`. Access a service with `yield* Tag` inside `Effect.gen`, or `Tag.use((service) => effect)`.
2. `react-hooks/rules-of-hooks` (from the Next ESLint config) treats `Tag.use(...)` as a React hook and errors in functions that aren't components or hooks.
3. `tsc` can accept code that the Effect language service rejects (for example, a ternary returning differently typed `Effect.fail` branches was reported as `missingEffectContext`). Only the `effect-language-service diagnostics` CLI shows this; the tsconfig plugin alone affects only the editor.

## Resolution
1. Use `yield* Tag` / `Tag.use`.
2. The hooks rule is off for non-React server code (`core`, `db`, `app/src/{server,modules}`). In `.tsx` files (pages), use `Effect.gen` + `yield* Tag` instead of `Tag.use`.
3. Every Effect package's `typecheck` script runs `effect-language-service diagnostics --strict`. Write branching handlers with `Effect.fn` / `Effect.gen` and `return yield* new SomeError(...)`.

## Rule going forward
Check Effect APIs against `node_modules/effect/AGENTS.md` and `ai-docs/`, not memory (most examples online are v3). In React files, access services with `yield*`. Treat `npm run typecheck` (tsc + Effect diagnostics) as the source of truth.
