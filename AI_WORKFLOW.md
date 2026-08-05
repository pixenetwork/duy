# Multi-AI Development Workflow

This repository uses a coordinated AI team. Use the right specialist when the task benefits from it, but only one primary writer may implement a given branch or pull request at a time.

## Priority
1. Security, platform, and repository protection requirements.
2. The nearest `AGENTS.md` and project documentation.
3. This workflow.
4. Tool-specific suggestions.

## Roles
- **ChatGPT / orchestrator:** architecture, specifications, decomposition, coordination, reconciliation, and readiness summaries.
- **Codex or assigned coding agent:** primary implementation, tests, and documentation.
- **CodeRabbit:** automatic pull-request review; address actionable findings or document why they do not apply.
- **Claude:** security, architecture, threat-model, and difficult-logic review when risk warrants it.
- **Cursor:** local integration, debugging, navigation, and targeted manual fixes.
- **Perplexity:** current external research; research never replaces repository inspection or tests.
- **Gemini or Jules:** second opinions, overflow work, UI review, or architecture tie-breakers.
- **Duy:** product decisions, live testing, production approval, and final merge authority.

## Delivery flow
1. Read `AGENTS.md`, this file, README, changelog, manifests, and relevant docs.
2. Inspect the implementation and open work before editing.
3. Work on a feature/fix branch; never push implementation changes directly to `main` or `master`.
4. Assign one primary writer and keep the diff scoped.
5. Run relevant tests, builds, validators, syntax checks, and static checks.
6. Record exactly what ran, what did not, and what still needs live/manual testing.
7. Open a draft PR unless Duy explicitly requests otherwise.
8. Require CodeRabbit review; add Claude or another specialist for security, migrations, destructive actions, protected code, unfamiliar APIs, architecture changes, concurrency/state bugs, or major UI changes.
9. Resolve actionable findings and rerun affected checks.
10. Do not merge until required checks pass and Duy approves production-impacting work.

## Safety
- Never commit or invent secrets, credentials, private keys, or production data.
- Never claim a test passed unless it was actually run and observed.
- Do not edit protected, Asset Escrow, Keymaster, opaque vendor, generated, or minified files unless explicitly allowed.
- For FiveM work, keep authorization and persistent-state decisions server-authoritative, validate all client input, and never add manual ReaperV4 imports or manifest dependencies unless Duy explicitly requests them.
- Destructive database, infrastructure, deployment, billing, or account actions require explicit human approval and a rollback plan.
- Preserve backward compatibility unless a breaking change is explicitly authorized.

## Handoff
Include goal, scope, changed behavior/files, primary writer, specialist reviewers, checks actually run, unresolved risks, live-test requirements, and rollback notes.

When agents disagree, compare claims against code, tests, official primary documentation, and project invariants. Duy makes the final product or production decision.
