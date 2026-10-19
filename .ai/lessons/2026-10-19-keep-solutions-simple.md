# Keep solutions simple; no unrequested complexity

- Date: 2026-10-19
- Context: review of the engineering-standards spec (user instruction)

## Finding
The user explicitly asked to keep the solution simple and not introduce complexity that isn't needed or requested. The draft spec included speculative pieces (event PubSub, optimistic locking, soft delete on every entity, OpenTelemetry, extra lint plugins).

## Resolution
The spec now has a "keep it simple" principle; speculative patterns are marked "when needed" and left out of the foundation work.

## Rule going forward
Build only what the current feature needs. Before adding a dependency, package, layer, abstraction or pattern, state the concrete reason; if there isn't one, don't add it.
