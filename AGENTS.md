# Repository Agent Instructions

`AI_WORKFLOW.md` is the canonical, authoritative AI workflow / agent-instructions
document for this repository. Read it in full before making any change. This file
is a short entry point that pins the non-negotiable rules.

Before editing, also read the README, `CHANGELOG.md`, resource manifests,
`.zzzops/PROJECT.md`, and the nearest relevant docs.

## Non-negotiable rules

1. **One primary writer** per branch/PR. Advisory agents review or research only
   and must not create competing edits to an owned surface without an explicit
   handoff recorded in the PR.
2. **Never push implementation work directly to `main`.** Use a scoped branch and
   a draft PR; keep the diff tightly scoped to the requested task.
3. **CI-before-review escalation:** fix or escalate failing CI/required checks
   before requesting or retriggering any external review.
4. **Review-budget backoff:** stabilize the diff before requesting review; do not
   trigger repeated external reviews on a moving or noisy diff.
5. **Honest validation evidence:** run the available local checks, bind evidence
   to the exact candidate head, and never claim validation that was not run.
   GitHub Actions results are provenance only and are not authoritative
   validation here.
6. **Fail closed and stay server-authoritative** for FiveM authorization and
   persistent state; treat client/NUI input as untrusted.
7. **Do not edit** secrets, protected/vendor/generated/minified content, or add
   destructive SQL without explicit authorization.
8. **Duy retains final authority** for product decisions, production actions, and
   merge approval.

CodeRabbit and the Claude GitHub Actions review workflows are retired and are not
required gates; do not revive or depend on them.
