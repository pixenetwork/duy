# AI Workforce Instructions

- ChatGPT is the CTO/orchestrator and defines scope, acceptance criteria, architecture, and task ownership.
- Exactly one primary implementation agent owns each branch or pull request: Codex, Claude Code, Cursor, Jules, or GitHub Copilot.
- Never push directly to `main`; use a focused branch and PR.
- Codex handles large implementations and repository-wide repairs.
- Claude Code handles complex debugging, refactors, test/build loops, and deep security/architecture audits.
- Cursor Pro handles day-to-day local development, UI work, targeted edits, and interactive testing.
- Jules handles bounded autonomous GitHub issues, tests, maintenance, and documentation.
- GitHub Copilot provides inline and GitHub-native assistance.
- CodeRabbit reviews every substantive PR; resolve or explicitly disposition findings before merge.
- Perplexity is for current research and documentation verification. Gemini is a second opinion or tie-breaker.

## Required workflow
1. Read repository documentation and existing conventions before editing.
2. Name the primary AI owner in the PR description.
3. Make the smallest coherent change and avoid unrelated refactors.
4. Run available lint, tests, typechecks, builds, and security checks.
5. Update documentation and changelog when behavior changes.
6. Never commit secrets, credentials, tokens, production data, or local environment files.
7. Document assumptions and any validation that could not be completed.
