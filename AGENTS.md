# Repository Agent Instructions

Read `AI_WORKFLOW.md`, README, changelog, manifests, `.zzzops/PROJECT.md`, and relevant docs before editing.

## Required rules

1. Assign exactly one primary writer per branch/PR. Other agents may review or advise but must not create competing edits to the same ownership surface.
2. Never push implementation work directly to `main` or `master`; use a scoped branch and draft PR.
3. Keep changes tightly scoped to the requested task and preserve backward compatibility unless a breaking change is explicitly approved.
4. Run relevant checks before requesting external review, and report exact commands/results with honest pass/fail status.
5. If CI or required checks fail, fix or escalate those failures before requesting another external review cycle.
6. Apply review-budget backoff: stabilize the diff first; do not trigger repeated external reviews on noisy or in-flight changes.
7. Never commit secrets, credentials, private keys, production data, or generated/vendor/protected content unless explicitly authorized.
8. Require independent exact-head review for substantive changes, and escalate security, architecture, permissions, persistence, or destructive-risk work to a specialist reviewer. CodeRabbit is retired from the active review stack and is not a required gate.
9. Bind promotion evidence to the exact candidate head using approved local/direct validation. GitHub Actions results are provenance only and are not authoritative validation for this repository.
10. Duy retains final authority for product decisions, production actions, and merge approval.
