# Repository Agent Instructions

Read `AI_WORKFLOW.md`, the README, manifests, changelog, and relevant documentation before editing.

## Required rules

1. Use one primary writer per branch or pull request. Other agents may review, research, or advise but must not create competing edits.
2. Work through a scoped branch and draft pull request. Never write implementation changes directly to `main` or `master`.
3. Inspect existing code, open work, dependencies, and project conventions before proposing changes.
4. Keep diffs limited to the requested task and preserve backward compatibility unless a breaking change is explicitly authorized.
5. Never commit secrets, credentials, private keys, personal data, production data, generated noise, or unapproved dependencies.
6. Do not edit opaque vendor, generated, minified, protected, or licensed files unless the repository explicitly permits it.
7. Run the most relevant available tests, builds, validators, linters, and syntax checks. Report exact results and never claim testing that did not occur.
8. Update documentation and changelog entries for behavior-changing work when applicable.
9. Require CodeRabbit review. Add specialist security or architecture review for high-risk changes.
10. Duy retains final authority over product decisions, production actions, and merge approval.

Follow `AI_WORKFLOW.md` for role selection, escalation, handoffs, and disagreement resolution.
