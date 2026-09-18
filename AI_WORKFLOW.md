# Multi-AI Development Workflow

This is the single canonical AI workflow / agent-instructions document for
`pixenetwork/duy`. Multiple AI assistants may contribute, but each branch or
pull request has **exactly one primary writer at a time**.

Read this file, `AGENTS.md`, the README, `CHANGELOG.md`, resource manifests,
`.zzzops/PROJECT.md`, and the nearest relevant docs before editing.

## Priority order

When guidance conflicts, obey the higher item first:

1. Security and repository-protection requirements.
2. `AGENTS.md`, `.zzzops` policy, and the nearest project documentation.
3. This workflow.
4. Tool-specific defaults.

## Roles

- **Primary writer (assigned coding agent):** owns implementation, tests, and
  docs for one scoped change on one branch/PR.
- **Advisory agents:** research and review only. They must not create competing
  edits to a surface owned by the primary writer unless ownership is explicitly
  handed off in the PR.
- **Independent reviewers:** exact-head correctness, security, architecture, and
  regression review, requested only after checks are green and the diff is
  stable. Escalate security, permissions, persistence, concurrency, or
  destructive-risk work to a specialist reviewer.
- **Duy:** final authority for product decisions, production actions, and merge
  approval.

CodeRabbit and the Claude GitHub Actions review workflows are retired from the
active review stack for this repository and are **not** required gates. Do not
revive or depend on them.

## One-primary-writer rule

- Assign exactly one primary writer per branch/PR and keep the diff focused.
- Do not run two writers concurrently on the same file set, migration sequence,
  runtime resource, or other conflict-prone ownership surface.
- Record an explicit handoff in the PR before another implementation agent takes
  ownership; serialize or rebase rather than racing or overwriting.

## Delivery flow

1. Read `AGENTS.md`, this file, README, changelog, manifests, and relevant docs.
2. Inspect existing code, open issues, and open PRs before editing so you do not
   duplicate or collide with in-flight work.
3. Keep one primary writer and a tightly scoped diff. Never push implementation
   work directly to `main`; use a scoped branch and a draft PR.
4. Run available local validation (`npm test`, `npm run validate`,
   `npm run verify`, syntax checks, and other relevant scripts) and record the
   exact commands and outputs.
5. Open or keep a **draft** PR while work is in progress.
6. **CI-before-review escalation:** if CI or a required check fails, fix or
   escalate that failure before requesting or retriggering any external review.
7. **Review-budget backoff:** when reviews become noisy or repetitive, pause new
   review requests, stabilize the diff, then request one fresh review. Do not
   trigger repeated external reviews on a moving or unstable diff.
8. Resolve actionable findings, rerun the affected checks, and report exactly
   what was revalidated on the current candidate head.
9. Merge only after required checks pass and Duy approves.

## Validation and evidence integrity

- Bind promotion evidence to the exact candidate head using approved
  local/direct validation.
- GitHub Actions results are provenance only for the SHA they actually tested
  and are not authoritative validation for this repository. Do not use Actions
  runners as a substitute for approved local/direct validation.
- **Never claim validation that was not actually run.** Report honest pass/fail
  status with the exact commands and results.

## Safety rules

- Never commit secrets, credentials, private keys, webhook URLs, production
  data, or generated/vendor/protected content unless explicitly authorized.
- For FiveM work, keep authorization, money, inventory, identity, progression,
  and persistent-state decisions server-authoritative and fail closed.
- Treat clients, NUI, commands, callbacks, identifiers, and network-event
  payloads as untrusted; revalidate permissions, ownership, state, distance,
  and rate limits server-side.
- Do not edit Asset Escrow, opaque vendor, generated, or minified files unless
  explicitly authorized.
- Do not add destructive SQL (broad `DELETE`, `DROP`, `TRUNCATE`, unsafe
  `ALTER`) without an explicit, narrowly scoped, approved migration.
- Preserve platform decisions: FiveM Enhanced only; no ESX/QBCore/legacy
  compatibility assumptions unless an approved adapter exists.
