# Multi-AI Development Workflow

This repository allows multiple AI assistants, but each branch/PR has exactly one
primary writer at a time.

## Priority order

1. Security and repository protection requirements.
2. `AGENTS.md`, `.zzzops` policy, and nearest project documentation.
3. This workflow.
4. Tool-specific defaults.

## Roles

- **Primary writer (assigned coding agent):** implementation, tests, and docs
  for the scoped change.
- **Advisory agents:** research/review only unless ownership is explicitly
  handed off in the PR.
- **Independent reviewers:** exact-head correctness, security, architecture,
  and regression review after checks are green and the diff is stable.
- **Duy:** final merge and production authority.

CodeRabbit is retired from the active review stack and is not a required gate.

## Delivery flow

1. Read `AGENTS.md`, this file, README, changelog, manifests, and relevant docs.
2. Inspect existing code, open issues, and open PRs before editing.
3. Keep one primary writer and a focused diff. Record an explicit handoff before
   another implementation agent takes ownership.
4. Run available local validation (`npm test`, `npm run validate`, syntax checks,
   and other relevant scripts) and record exact outputs.
5. Open or keep a draft PR while work is in progress.
6. **CI-before-review escalation:** if CI or required checks fail, fix or escalate
   those blockers before requesting or retriggering external review.
7. **Review-budget backoff:** when reviews become noisy or repetitive, pause new
   review requests, stabilize the diff, then request one fresh review.
8. Resolve actionable findings, rerun affected checks, and report what was
   revalidated on the exact candidate head.
9. Merge only after required checks pass and Duy approves.

## Safety rules

- Never claim validation that was not actually run.
- Never commit secrets, credentials, webhook URLs, or protected content.
- For FiveM work, keep authorization and persistent-state decisions
  server-authoritative and validate untrusted client/NUI input.
- Do not edit Asset Escrow, opaque vendor, generated, or minified files unless
  explicitly authorized.
- Do not use GitHub Actions runners as a substitute for approved local/direct
  validation evidence.
