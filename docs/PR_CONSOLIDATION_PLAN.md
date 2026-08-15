# PR Consolidation Plan (Issue #9)

This plan inventories connectivity and AI-workflow pull requests and records
unambiguous disposition so audit history is preserved.

The inventory snapshot was captured on 2026-08-12 and its closure state was
refreshed on 2026-08-14. PR #10's recorded SHA is the source head used for the
original correction; later documentation-only consolidation commits may advance
the draft head without changing the recorded point-in-time audit snapshot.

## PR inventory and disposition

| PR | Snapshot state | Draft | Head branch | Head SHA | Disposition |
| --- | --- | --- | --- | --- | --- |
| [#3](https://github.com/pixenetwork/duy/pull/3) | Open | No | `jules-8787062650167170836-3fda32aa` | `34394d30a9644a87eaa829cb2fe3fc32e6332b53` | Closed as superseded by #10; audit history retained |
| [#4](https://github.com/pixenetwork/duy/pull/4) | Open | Yes | `copilot/add-agent-connectivity-md` | `f692c28246757bca2f211ddd329cdf385daa9f95` | Closed as superseded by #10; audit history retained |
| [#5](https://github.com/pixenetwork/duy/pull/5) | Open | Yes | `cursor/connectivity-test-0452` | `89cf2dc6fc66a2363bf83420c64f590c6a75cec0` | Closed as superseded by #10; audit history retained |
| [#6](https://github.com/pixenetwork/duy/pull/6) | Open | Yes | `agent/standardize-ai-workflow` | `0068e036a2b68dc556a07cfb0abd5c2f2c06d9c6` | Closed as superseded by #10; #8 is only an intermediate source |
| [#8](https://github.com/pixenetwork/duy/pull/8) | Open | No | `chore/ai-workforce-integration` | `faf952bc8ee2126c603785a18b6b68c5d3f430ca` | Closed 2026-08-14 as superseded by #10; its `CLAUDE.md` is retained in #10 |
| [#10](https://github.com/pixenetwork/duy/pull/10) | Open | Yes | `copilot/consolidate-stale-prs` | `4951a331fb89a104c78dec0ae5bf90f3c185cc8a` | Keep as the single draft consolidation PR until its exact-head checks/review are clean |

The unassociated branch `add-claude-github-actions-1785889988405` was also
present at `2762a9d89e6e3ce2a36ca2411760ff3648aee342`.
Its only recorded change adds
`.github/workflows/claude-code-review.yml`. It is excluded from #10 and left
unchanged because the consolidation intentionally keeps external-review
execution gated instead of reviving an unvalidated workflow branch.

## Closure-note template (preserve audit history)

Use this message when closing superseded PRs:

> Closing as superseded by #10 consolidation for issue #9. This PR's history
> remains part of the audit trail; its intent/content was inventoried in
> `docs/PR_CONSOLIDATION_PLAN.md`.

## Execution order

1. Keep #10 as the only active consolidation PR.
2. Keep #3, #4, #5, #6, and #8 closed as superseded; preserve their audit history.
3. Confirm #10 contains the canonical file set listed below with no runtime,
   SQL, vendor, generated, minified, or other protected-content edits.
4. Run exact-head validation and obtain a fresh independent review before
   changing #10 from draft or merging it.

## Canonical content to retain in the consolidation PR

- `AGENTS.md`
- `AI_WORKFLOW.md`
- `CLAUDE.md` (retained from superseded PR #8 as the Claude-specific entry point)
- `.github/copilot-instructions.md`
- `.coderabbit.yaml`

No runtime FiveM behavior, SQL, vendor, generated, minified, or other protected
content changes are included.

## Validation

These checks were run against the proposed correction on 2026-08-12 before
commit. Automatic review remains disabled so CI and diff stability can be
confirmed before any manual review request.

Markdown validation:

```shell
NPM_CONFIG_CACHE=/tmp/duy-npm-cache npx --yes markdownlint-cli2@0.23.2 \
  AI_WORKFLOW.md docs/PR_CONSOLIDATION_PLAN.md
```

Result: **PASS** (exit 0; 0 errors).

Review-gate configuration validation:

```shell
python <<'PY'
import yaml

with open(".coderabbit.yaml", encoding="utf-8") as stream:
    config = yaml.safe_load(stream)

auto_review = config["reviews"]["auto_review"]
assert auto_review == {
    "enabled": False,
    "drafts": False,
    "auto_incremental_review": False,
}
PY
```

Result: **PASS** (exit 0).

The 2026-08-14 follow-up adds only the previously reviewed `CLAUDE.md` from
superseded PR #8 and this disposition update. A fresh exact-head review is
required before #10 is promoted or merged.
