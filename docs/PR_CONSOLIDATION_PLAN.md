# PR Consolidation Plan (Issue #9)

This plan inventories open connectivity and AI-workflow pull requests and records unambiguous disposition so audit history is preserved.

Inventory verified against current open PRs on 2026-08-12 (`#3`, `#4`, `#5`, `#6`, `#8`, `#10`).

## Open PR inventory and disposition

| PR | Scope | Disposition | Why unambiguous |
| --- | --- | --- | --- |
| #3 Add Jules Agent Connectivity Test | Connectivity marker only | Close as superseded by #10 after posting closure note | Same purpose as #4/#5 connectivity markers; no runtime behavior impact |
| #4 Add Copilot connectivity marker document | Connectivity marker only | Close as superseded by #10 after posting closure note | Duplicate connectivity marker purpose |
| #5 Add Cursor agent connectivity acknowledgment | Connectivity marker only | Close as superseded by #10 after posting closure note | Duplicate connectivity marker purpose |
| #6 Standardize multi-AI development workflow | Early AI workflow draft | Close as superseded by #10 after posting closure note | Narrower and older than later shared workflow set |
| #8 chore: integrate the shared AI workforce | Canonical workflow/instruction content | Keep open only until #10 remains unchanged and includes canonical files, then close as superseded by #10 | Contains the comprehensive instruction set to keep |
| #10 Consolidate stale connectivity/AI-workflow PR scope into one canonical draft instruction set | Housekeeping consolidation | Keep open as the single draft PR; do not merge without Duy approval | Current primary-writer consolidation vehicle |

## Closure-note template (preserve audit history)

Use this message when closing superseded PRs:

> Closing as superseded by #10 consolidation for issue #9. This PR's history remains part of the audit trail; its intent/content was inventoried in `docs/PR_CONSOLIDATION_PLAN.md`.

## Execution order (unambiguous closure sequencing)

1. Keep #10 as the only active draft consolidation PR.
2. Post closure note and close #3, #4, #5, and #6 as superseded.
3. Confirm #10 still contains the canonical file set listed below with no runtime/SQL/protected-content edits.
4. Post closure note and close #8 as superseded by #10.
5. Leave #10 open for final approval and merge decision by Duy.

## Canonical content to retain in the consolidation PR

- `AGENTS.md`
- `AI_WORKFLOW.md`
- `.github/copilot-instructions.md`
- `.coderabbit.yaml`

No runtime FiveM behavior, SQL, or protected content changes are included.
