# PR Consolidation Plan (Issue #9)

This plan inventories open connectivity and AI-workflow pull requests and
records unambiguous disposition so audit history is preserved.

The snapshot below was captured on 2026-08-12 before this correction commit.
PR #10's recorded SHA is therefore the source head used for the correction,
while the other entries are point-in-time remote heads.

## Open PR inventory and disposition

| PR | State | Draft | Head branch | Head SHA | Disposition |
| --- | --- | --- | --- | --- | --- |
| [#3](https://github.com/pixenetwork/duy/pull/3) | Open | No | `jules-8787062650167170836-3fda32aa` | `34394d30a9644a87eaa829cb2fe3fc32e6332b53` | Close as superseded by #10 after posting the closure note |
| [#4](https://github.com/pixenetwork/duy/pull/4) | Open | Yes | `copilot/add-agent-connectivity-md` | `f692c28246757bca2f211ddd329cdf385daa9f95` | Close as superseded by #10 after posting the closure note |
| [#5](https://github.com/pixenetwork/duy/pull/5) | Open | Yes | `cursor/connectivity-test-0452` | `89cf2dc6fc66a2363bf83420c64f590c6a75cec0` | Close as superseded by #10 after posting the closure note |
| [#6](https://github.com/pixenetwork/duy/pull/6) | Open | Yes | `agent/standardize-ai-workflow` | `0068e036a2b68dc556a07cfb0abd5c2f2c06d9c6` | Close as superseded by #10 after posting the closure note; #8 is only an intermediate source |
| [#8](https://github.com/pixenetwork/duy/pull/8) | Open | No | `chore/ai-workforce-integration` | `faf952bc8ee2126c603785a18b6b68c5d3f430ca` | Keep until #10 retains the canonical files, then close as superseded by #10 |
| [#10](https://github.com/pixenetwork/duy/pull/10) | Open | Yes | `copilot/consolidate-stale-prs` | `4951a331fb89a104c78dec0ae5bf90f3c185cc8a` | Keep as the single draft PR; do not merge without Duy approval |

The unassociated branch `add-claude-github-actions-1785889988405` was also
present at `2762a9d89e6e3ce2a36ca2411760ff3648aee342`.
Its only recorded change adds
`.github/workflows/claude-code-review.yml`. It is excluded from #10 and left
unchanged pending Duy's explicit disposition.

## Closure-note template (preserve audit history)

Use this message when closing superseded PRs:

> Closing as superseded by #10 consolidation for issue #9. This PR's history
> remains part of the audit trail; its intent/content was inventoried in
> `docs/PR_CONSOLIDATION_PLAN.md`.

## Execution order (unambiguous closure sequencing)

1. Keep #10 as the only active draft consolidation PR.
2. Post closure note and close #3, #4, #5, and #6 as superseded.
3. Confirm #10 still contains the canonical file set listed below with no
   runtime, SQL, vendor, generated, minified, or other protected-content edits.
4. Post closure note and close #8 as superseded by #10.
5. Leave #10 open for final approval and merge decision by Duy.

## Canonical content to retain in the consolidation PR

- `AGENTS.md`
- `AI_WORKFLOW.md`
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
