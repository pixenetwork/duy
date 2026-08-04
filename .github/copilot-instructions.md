# Repository-wide AI instructions

Before changing code, read the root `AGENTS.md`, `AI_WORKFLOW.md`, README, manifests, changelog, and relevant documentation. The nearest project-specific instruction always overrides a generic suggestion.

- Use one primary implementation agent per branch or pull request. Other agents review, research, or advise; they must not create competing edits to the same diff.
- Never push implementation work directly to `main` or `master`. Use a scoped branch and draft pull request unless Duy explicitly says otherwise.
- Inspect existing code and open work before proposing or applying changes. Preserve public APIs, configuration compatibility, file layout, and project invariants unless a breaking change is explicitly authorized.
- Keep the diff limited to the requested task. Do not add unrelated refactors, dependencies, generated files, telemetry, secrets, placeholders, or speculative features.
- Never modify protected, Asset Escrow, Keymaster, opaque vendor, minified, or generated code unless repository instructions explicitly allow it.
- For FiveM code, treat the client and NUI as untrusted, keep authorization and persistent-state decisions server-authoritative, validate event inputs and ownership, and never add manual ReaperV4 imports or manifest dependencies unless Duy explicitly requests them.
- Add or update tests and documentation appropriate to the change. Run available checks and report exact commands/results. Never claim live, multiplayer, device, database, or production validation that was not actually performed.
- Update `CHANGELOG.md` for behavior-changing work when the repository uses one.
- Require CodeRabbit review and resolve actionable findings. Escalate security, migration, destructive-operation, architecture, protected-code, concurrency/state, and major UI changes for specialist review.
- Duy remains the final authority for product decisions, live testing, production deployment, and merge approval.
