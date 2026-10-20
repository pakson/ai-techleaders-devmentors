# DevMentor backward compatibility

These are the existing contract surfaces observed in this private npm workspace. Internal package APIs are protected because other workspace packages consume them; this document does not imply external publication or a new release policy. `AGENTS.md` and approved specifications remain authoritative.

## Protected surfaces

| Surface | Current contract | Breaking changes |
| --- | --- | --- |
| HTTP | `GET /api/health` returns 200 with `{ "status": "ok" }`. Errors use `{ error: { code, message, details? } }`. | Removing or renaming the route or fields; incompatible types, status codes or error semantics. |
| Error mapping | Validation 400, unauthorized 401, forbidden 403, missing resource 404, conflict 409, business rule 422, internal failure 500, interruption 503. DB/config errors and defects expose generic internal errors. | Changing mappings or exposing private causes, secrets or SQL. |
| Server actions | `ActionResult<T>` is `{ ok: true, data }` or `{ ok: false, error: { code, message, fieldErrors? } }`. | Changing discriminants, payloads or failure handling expected by clients. |
| Shared schemas | UUID ids, ISO timestamps, pagination defaults page 1/pageSize 20/order asc, pageSize maximum 100, list envelope `{ items, total, page, pageSize }`. | Tightening accepted input or changing codecs, defaults or response shapes incompatibly. |
| Core exports | Root plus `/config`, `/di`, `/errors`, `/http`, `/schemas`, `/validation`. | Removing import paths or incompatible exported signatures, types or behavior. |
| DB exports | Root and `/entities`; ORM lifecycle, DI and Effect database helpers. | Incompatible imports, resource lifetime or transaction behavior. |
| UI exports | `/components/*`, `/frontend/*`, `/lib/*`, `/hooks/*`, `/globals.css` as declared in `packages/ui/package.json`. | Removing supported imports or incompatible props, variants or theme tokens. Wildcard declarations do not promise nonexistent files. |
| Persistent data | `users`: UUID primary key, unique required email (320 characters), required name, timestamps; base ids use UUIDv7. | Destructive schema changes, invalidating existing data or altering applied migrations. |
| Runtime configuration | Required `DATABASE_URL`; pool defaults 0/10; debug defaults false. Real environment variables override env files. | Renaming variables, new required variables without migration guidance, or incompatible defaults and parsing. |
| Test and tooling entry points | Root npm scripts, npm workspaces, Node >=22.17; `TEST_DATABASE_URL`, `E2E_BASE_URL`, `AGENT_BROWSER_SESSION`; Vitest and agent-browser evidence. | Removing commands, changing options incompatibly, weakening isolation or dropping evidence consumed by CI. |
| User routes | `/` and `/backend`; separate root layouts; backend reports database availability with generic failures. | Removing destinations, breaking navigation or exposing private infrastructure errors. |
| Pipeline configuration | `.ai/agentic.config.json` version 1 and selected tracker/browser descriptors. | Removing supported fields or operations without updating consuming skills and documenting migration. |

No application event or webhook contract was found in the inspected source. Add a surface here when one is introduced.

## Required change path

For a protected-surface change, identify consumers and explain compatibility in the spec and PR. Prefer additive changes; otherwise update all internal consumers in the same change, provide migration and rollback notes, and test both the producer and consuming behavior. If a consumer cannot move together, document a transition and removal date in the approved spec before removing its supported contract. Do not invent a deprecation window or public package version policy for this private workspace.

Persisted changes require a new reviewed MikroORM migration, validation against disposable databases, and a rollback plan; never edit an applied migration. Document irreversible data transformations explicitly.

Update environment examples and affected documentation alongside configuration changes. Preserve credential redaction. CI job changes require explicit authorization and coordinated required-check updates under the repository rules. Every check must finish green for the latest PR head before merge.
