# Pin validated targets across subprocess boundaries

- Date: 2026-10-20
- Context: installer review of PR #7

## Finding
Setup checked one DATABASE_URL while the migration subprocess independently loaded higher-priority Next environment files. The subprocess could write to an external database that setup never confirmed. Pipe chunks also split URLs, defeating chunk-by-chunk redaction; a hidden lockfile did not prove dependencies were healthy.

## Resolution
Pass the exact validated URL into the child environment, redact complete output lines, and let npm reconcile its actual tree on every setup run. Test the consuming subprocess boundary and partial setup state.

## Rule going forward
A checked or confirmed target must be pinned into every consumer that can reload configuration. Test conflicting env files, split output chunks, and stale dependency markers rather than assuming identical loaders or complete state.
