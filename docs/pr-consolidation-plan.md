# PR Consolidation Plan (Issue #9)

**Refs:** [#9 — Consolidate stale connectivity and AI-workflow pull requests](https://github.com/pixenetwork/duy/issues/9)

This plan inventories every pull request in `pixenetwork/duy` (with focus on the
connectivity-marker and multi-AI workflow lanes), records an unambiguous
disposition for each, and preserves useful audit history. It also introduces the
single canonical AI workflow / agent-instructions document that is not currently
on `main`.

> **Closing is a human decision.** This plan **recommends** dispositions only.
> The primary writer does **not** close, merge, or reopen any PR. **Duy retains
> final approval** for every close/supersede action and for merging the
> consolidation PR itself.

## Baseline

- `main` head at inventory time: `998d69624f5784ffc50afd492656cd7178b213ad`.
- Inventory captured: 2026-09-18.
- On `main` there is **no** `AGENTS.md`, `AI_WORKFLOW.md`, `CLAUDE.md`,
  `.github/copilot-instructions.md`, `.coderabbit.yaml`, or `AGENT_CONNECTIVITY*`
  file. The only AI/CI-adjacent file already on `main` is
  `.github/workflows/codescan.yml`. The canonical workflow guidance is therefore
  genuinely missing from `main` and is what this consolidation restores.

## Full PR inventory and disposition

| PR | State | Draft | Head branch | Head SHA | Scope | Recommended disposition |
| --- | --- | --- | --- | --- | --- | --- |
| [#3](https://github.com/pixenetwork/duy/pull/3) | Closed | No | `jules-8787062650167170836-3fda32aa` | `c7da0d8d` | Connectivity marker (`AGENT_CONNECTIVITY.md`) | **Already closed** — keep closed, superseded by this consolidation. Audit history retained. |
| [#4](https://github.com/pixenetwork/duy/pull/4) | Closed | Yes | `copilot/add-agent-connectivity-md` | `f692c282` | Connectivity marker (`AGENT_CONNECTIVITY.md`) | **Already closed** — duplicate of #3 connectivity lane. Keep closed. |
| [#5](https://github.com/pixenetwork/duy/pull/5) | Closed | Yes | `cursor/connectivity-test-0452` | `89cf2dc6` | Connectivity marker (`AGENT_CONNECTIVITY_CURSOR.md`) | **Already closed** — duplicate connectivity lane. Keep closed. |
| [#6](https://github.com/pixenetwork/duy/pull/6) | Closed | Yes | `agent/standardize-ai-workflow` | `0068e036` | Early multi-AI workflow docs | **Already closed** — superseded by the canonical doc in this PR. Content folded in. Keep closed. |
| [#7](https://github.com/pixenetwork/duy/pull/7) | Merged | No | `add-claude-github-actions-1785889988405` | `2762a9d8` | Claude Code review workflow | **Merged, then reverted.** Per issue #9 comments the Claude workflows were removed and Claude is unavailable. Do **not** revive. No action. |
| [#8](https://github.com/pixenetwork/duy/pull/8) | Closed | No | `chore/ai-workforce-integration` | `faf952bc` | `AGENTS.md` + `CLAUDE.md` workforce integration | **Already closed** — superseded. `CLAUDE.md` intentionally **not** revived (Claude retired). Keep closed. |
| [#10](https://github.com/pixenetwork/duy/pull/10) | Closed | Yes | `copilot/consolidate-stale-prs` | `425e2c5f` | Prior consolidation attempt (added `.coderabbit.yaml`, `CLAUDE.md`, workflow docs, plan) | **Already closed.** Its plan is the reference for this one, but it revived CodeRabbit + Claude gates that are now retired; those parts are intentionally excluded. Keep closed. |
| [#15](https://github.com/pixenetwork/duy/pull/15) | **Open** | Yes | `fix/queue-runtime-integrity-status-20260907` | `faf20bb4` | TRIGGERcmd queue runtime fix + test (`ops/**`, `tests/**`) | **KEEP — out of scope.** Runtime/ops fix, not a connectivity/workflow PR. Not touched by this consolidation. Leave to its own writer/review. |
| [#16](https://github.com/pixenetwork/duy/pull/16) | **Open** | Yes | `cursor/duy-workflow-consolidation-e827` | `6f59dbe5` | Prior in-flight attempt at *this* issue (adds `AGENTS.md`, `AI_WORKFLOW.md`, `.github/copilot-instructions.md`) | **SUPERSEDED-BY this PR (close-candidate, Duy's decision).** Its content is the direct basis for the canonical doc here, consolidated into fewer files. Recommend Duy close #16 in favor of this PR once this diff is reviewed, or close this one — only one workflow-consolidation PR should remain. |

### Unassociated / dangling branches (no open PR)

- `add-claude-github-actions-1785889988405` (`2762a9d8`) — Claude review workflow;
  intentionally left dormant (Claude retired). **Close-candidate for branch
  cleanup, Duy's decision.**
- `hostops-v3-pc-cutover-b392533-20260828` and its `-final`, `-publish`, `-test`
  variants — HostOps cutover branches with no open PR. **Out of scope** for this
  workflow consolidation; flagged for separate ops review, not touched here.
- `ops/triggercmd-windows-mcp-repair-20260826`, `zzzops/policy-init-20260905`,
  `fix/bounded-offline-recovery-trigger-20260906` — already merged (PRs #11, #12,
  #14). Branches are safe to delete at Duy's discretion; **no action here.**

## Duplicate / superseded clusters (summary)

- **Connectivity-marker cluster:** #3, #4, #5 — three near-identical
  "agent connectivity" marker PRs across Jules/Copilot/Cursor. All already
  closed; superseded. No connectivity marker is carried into `main`; the
  canonical workflow doc records agent expectations instead.
- **Multi-AI workflow cluster:** #6, #8, #10, #16 — successive attempts to add
  workflow/agent instructions. #6, #8, #10 already closed. #16 is the only open
  member and is directly superseded by this PR's single consolidated doc.
- **Retired review tooling:** Claude Actions (#7) and CodeRabbit config (#10)
  are intentionally excluded — retired per issue #9 comments.

## What this PR adds (canonical content not already on `main`)

- `AI_WORKFLOW.md` — the single canonical AI workflow / agent-instructions
  document.
- `AGENTS.md` — short entry point pinning the non-negotiable rules and pointing
  to `AI_WORKFLOW.md`.
- `docs/pr-consolidation-plan.md` — this plan.

These make the following explicit, per issue #9:

- **One-primary-writer** ownership per branch/PR.
- **CI-before-review escalation** (fix/escalate CI before re-requesting review).
- **Review-budget backoff** (stabilize the diff; no repeated reviews on a moving
  diff).
- **Honest validation evidence** bound to the exact candidate head.
- **Duy's final approval** for merge and production.

**No** runtime FiveM behavior, SQL, vendor, generated, minified, or other
protected content is changed. The diff is documentation-only.

## Recommended execution order (for Duy)

1. Review this documentation-only consolidation PR at its exact head.
2. Choose the single surviving workflow-consolidation PR (this one or #16) and
   close the other as superseded, preserving audit history via a closing comment.
3. Keep connectivity PRs #3/#4/#5 and workflow PRs #6/#8/#10 closed.
4. Leave runtime PR #15 to its own writer/review cycle.
5. Optionally delete merged/dormant branches listed above.

## Closure-note template (preserve audit history)

When closing a superseded PR, use a message such as:

> Closing as superseded by the issue #9 workflow consolidation. This PR's
> history remains part of the audit trail; its intent and content are inventoried
> in `docs/pr-consolidation-plan.md`.
