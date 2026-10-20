# Separate local validation from CI and remove template preambles completely

- Date: 2026-10-20
- Context: User correction after agent pipeline setup.

## Finding

The initial pipeline configuration included integration and E2E in the local gate. The user wants those suites run by CI, while local automation runs lint, typecheck, unit coverage and the production build.

The generated SDLC also retained the tail of its template instruction comment. The renderer removed text only through the first `-->`, but the instruction comment itself contained example HTML markers with that token. Checking only for unresolved placeholders did not catch the visible residue.

## Resolution

Keep the configured local commands and active process documents consistent, and explicitly document integration/E2E as required CI evidence before merge. Remove the entire template preamble through the first intended document heading, rather than treating embedded examples as the end of the preamble.

## Rule going forward

For this repository, configure the local pipeline gate with lint, typecheck, unit tests and the production build; integration and E2E run in CI. When rendering a document template, verify its first nonblank line is the intended heading and that no authoring instructions or conditional markers remain.
