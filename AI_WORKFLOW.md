# Multi-AI Development Workflow

This repository allows multiple AI assistants, but each branch/PR has one primary writer.

## Priority order
1. Security and repository protection requirements.
2. `AGENTS.md` and nearest project documentation.
3. This workflow.
4. Tool-specific defaults.

## Roles
- **Primary writer (assigned coding agent):** implementation, tests, and docs for the scoped change.
- **Advisory agents:** research/review only unless ownership is explicitly handed off in the PR.
- **CodeRabbit:** external automated PR review after checks are green and the diff is stable.
- **Duy:** final merge and production authority.

## Delivery flow
1. Read `AGENTS.md`, this file, and relevant repository docs.
2. Inspect existing code and open PRs before editing.
3. Keep one primary writer and a focused diff.
4. Run available local validation (tests/build/typecheck/lint/static scripts) and record exact outputs.
5. Open or keep a draft PR while work is in progress.
6. **CI-before-review escalation:** if CI fails, fix or escalate CI blockers before requesting/retriggering external review.
7. **Review-budget backoff:** when reviews become noisy or repetitive, pause new review requests, stabilize the diff, then request one fresh review.
8. Resolve actionable findings, rerun affected checks, and report what was revalidated.
9. Merge only after required checks pass and Duy approves.

## Safety rules
- Never claim validation that was not actually run.
- Never commit secrets or protected content.
- For FiveM work, keep authorization and persistent-state decisions server-authoritative and validate untrusted client input.
