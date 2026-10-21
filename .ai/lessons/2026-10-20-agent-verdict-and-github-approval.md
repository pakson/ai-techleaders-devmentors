# Agent verdict and GitHub approval are separate signals

- Date: 2026-10-20
- Context: issue #8, analyzing the session that opened PR #7

## Finding

The same GitHub account authored PR #7 and published its clean agent reviews. Both review bodies say approve, but GitHub records them as COMMENTED, not APPROVED. The installed OM pipeline leaves the PR at review, and merge-buddy requires an APPROVED reviewDecision even though the effective main ruleset currently requires zero approving reviews. Historical comments also describe a draft while the current PR API reports a non-draft PR.

## Resolution

Filed issue #8 with publication, routing, downstream consumption, freshness and regression requirements. No pipeline fix or repository settings change was made.

The maintainer clarified that PR #7 originally remained draft after automation and was manually marked ready for review. Its current non-draft state is the result of that manual intervention, not evidence that the pipeline promoted it successfully. The older draft descriptions reflect the automation's original outcome.

## Rule going forward

When diagnosing review gates, inspect the actor, native review state, reviewed head SHA, current draft state and effective target-branch rules separately. A verdict in comment text or a routing label does not establish a native approval or permission to merge; neither does self-approval rejection establish that branch policy requires independent approval. Re-read current API state instead of treating historical comments as authoritative.

When live state differs from historical reports, establish who changed it and when before diagnosing a reporting defect or crediting automation with the transition. Record user-provided manual interventions explicitly.

## Post-merge label policy clarification

An audit of the installed OM lifecycle skills and SDLC found explicit transitions into merge-queue but no explicit requirement to remove that pipeline label after merge, no terminal merged label, and no PR-label cleanup in om-close-fixed-issues. The merge-buddy skill lists open PRs only. Retaining merge-queue on merged PR #6 therefore matches current behavior; removing it is a proposed policy improvement, not an existing mandatory skill step. Distinguish documented behavior from recommended conventions when explaining workflow compliance.
