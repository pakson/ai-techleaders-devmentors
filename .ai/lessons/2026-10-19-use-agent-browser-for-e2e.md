# Use agent-browser, not Playwright, for e2e and UI checks

- Date: 2026-10-19
- Context: review of the engineering-standards spec (user correction)

## Finding
The draft spec proposed Playwright for e2e tests. The user wants the `agent-browser` CLI (vercel-labs/agent-browser) instead.

## Resolution
Spec D6 changed: e2e tests are Vitest files that drive the `agent-browser` CLI (`--json`, dedicated `--session`), and agents use the same tool to check UI changes by hand.

## Rule going forward
Never add Playwright, Puppeteer or Cypress. Use `agent-browser` for e2e tests and browser checks.
