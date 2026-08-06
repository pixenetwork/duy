# PR Consolidation Plan (Issue #9)

This plan inventories open connectivity and AI-workflow pull requests and records unambiguous disposition so audit history is preserved.

## Open PR inventory and disposition

| PR | Scope | Disposition | Why unambiguous |
| --- | --- | --- | --- |
| #3 Add Jules Agent Connectivity Test | Connectivity marker only | Superseded; close with audit note | Same purpose as #4/#5 connectivity markers; no runtime behavior impact |
| #4 Add Copilot connectivity marker document | Connectivity marker only | Superseded; close with audit note | Duplicate connectivity marker purpose |
| #5 Add Cursor agent connectivity acknowledgment | Connectivity marker only | Superseded; close with audit note | Duplicate connectivity marker purpose |
| #6 Standardize multi-AI development workflow | Early AI workflow draft | Superseded by #8/#10; close with audit note | Narrower and older than later shared workflow set |
| #8 chore: integrate the shared AI workforce | Canonical workflow/instruction content | Consolidate into #10, then close as superseded | Contains the comprehensive instruction set to keep |
| #10 [WIP] Consolidate open PRs for connectivity and AI workflow | Housekeeping consolidation | Keep open as the single draft PR | Current primary-writer consolidation vehicle |

## Closure-note template (preserve audit history)

Use this message when closing superseded PRs:

> Closing as superseded by #10 consolidation for issue #9. This PR's history remains part of the audit trail; its intent/content was inventoried in `docs/PR_CONSOLIDATION_PLAN.md`.

## Canonical content to retain in the consolidation PR

- `AGENTS.md`
- `AI_WORKFLOW.md`
- `.github/copilot-instructions.md`
- `.coderabbit.yaml`

No runtime FiveM behavior, SQL, or protected content changes are included.
