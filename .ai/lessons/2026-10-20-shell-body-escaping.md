# Shell body escaping

- Date: 2026-10-20
- Context: Publishing the issue 5 spec PR with a multiline Markdown body

## Finding

Embedding `JSON.stringify(body)` directly in a shell command does not make the value shell-safe. Backticks inside the Markdown were interpreted as command substitutions, which ran unrelated npm and Next.js commands while creating a malformed PR body.

## Resolution

The PR body was read back, replaced through a temporary body file, and the accidental process was checked for cleanup. The existing user dev server was left untouched.

## Rule going forward

Create multiline tracker bodies with `apply_patch` into a temporary file and pass them with `--body-file` or `gh api -F body=@...`. Never interpolate JSON or Markdown into a shell command.
