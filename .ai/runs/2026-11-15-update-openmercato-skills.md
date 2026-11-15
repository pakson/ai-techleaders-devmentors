# Update Open Mercato skills

- Goal: Update the repository's installed Open Mercato skills from the published source and reconcile pipeline artifacts.
- Related spec: None; this updates vendored skills and their existing configuration.
- Steps: Compare the published collection and installation metadata with the local copy; preserve local adaptations; reconcile descriptors; verify the resulting installation and repository checks.
- Initial state: clean worktree; source recorded in `skills-lock.json` is `open-mercato/skills`.
- Commands: read the upgrade skill, project lessons, configuration and installation metadata; `git ls-remote --symref https://github.com/open-mercato/skills.git HEAD` identified `main` at `a90b091d27141a6cd12f363e94ebd0f5f84ba615`.
- Baseline: all 59 pre-existing skills and both installed descriptors matched upstream commit `b6885a8` byte-for-byte; there were no local customizations to overwrite.
- Installed upstream commit `a90b091d27141a6cd12f363e94ebd0f5f84ba615` with `npx --yes skills add open-mercato/skills --skill '*' --agent claude-code --yes`. The installer placed copies in `.claude/skills`; restored the project's canonical `.agents/skills` layout and relative Claude symlinks. All 74 skills match the published source, and all 74 lock entries and links resolve.
- Updated `.ai/trackers/github.md` and `.ai/browsers/agent-browser.md` to their shipped versions. The new GitHub claim protocol uses atomic refs; old and new claimers cannot safely run concurrently. The browser install pin changed from v0.35.2 to v0.41.1.
- Added the documented autofix and automerge configuration defaults. Set `automerge.mode` to `prepare-to-merge`, `requireIndependentReview` and `defaultToHumanQa` to true to preserve the project's merge and QA restrictions. Added merge-buddy runtime paths to `.gitignore`. No external tracker or repository settings were changed; optional harness setup was not installed.
- Verification: `npm ci --no-audit --no-fund`, `npm run lint`, `npm run typecheck`, `npm test` and `NODE_ENV=production npm run build` passed. Unit tests: 18 files, 122 tests, 100% statements, branches, functions and lines; evidence: `test-results/unit/junit.xml`, `coverage/coverage.txt`.
- Upstream provider tests passed: 51 tracker operations and 8 browser operations; installed descriptors match shipped files. Upstream `npm run lint` also passed. Config parses; all skill names, lock entries and links agree; `git diff --check` passes; `gh` is v2.102.1.
- Handoff: changes are ready for review. The separately supplied `/workspace/.agents/skills` runtime copy is outside this worktree and was not modified; avoid concurrent runs from old and new copies because their claim protocols differ.
