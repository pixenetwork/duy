# Repository-wide AI instructions

Before changing code, read `AGENTS.md`, `AI_WORKFLOW.md`, README, changelog, and relevant docs.

- Enforce one-primary-writer ownership per branch/PR.
- Keep the diff scoped; avoid unrelated refactors and protected/vendor/generated edits.
- Run relevant checks and report exact results honestly.
- Follow CI-before-review escalation: address CI failures before requesting another external review.
- Apply review-budget backoff: stabilize diffs before retriggering external review tools.
- Treat FiveM client/NUI input as untrusted and keep authorization/state decisions server-authoritative.
- Prefer independent exact-head review for substantive changes and specialist review for high-risk or security-sensitive changes. CodeRabbit is retired and is not a required gate.
- Duy is the final authority for merge and production decisions.
