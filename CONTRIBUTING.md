# Contributing to Debate-AI

Thanks for your interest in contributing! We welcome bug reports, documentation improvements, feature ideas, and pull requests.

Debate-AI is a Bun + Turborepo monorepo: the web app lives in `apps/debate-ai.com`, and shared libraries — including the `reason-editor` argument editor — live in `packages/`.

## Before You Start

- Read the [README](README.md), the [CLAUDE.md](CLAUDE.md) repo guide, and the docs under [`packages/debate-help-docs/content/docs`](packages/debate-help-docs/content/docs).
- Search [existing issues](https://github.com/debate/debate-ai.com/issues) and [pull requests](https://github.com/debate/debate-ai.com/pulls) to avoid duplicating work.
- For substantial changes — new tools, schema changes, or changes to how arguments and evidence are modeled — open an issue first to discuss the problem, proposed approach, and scope.
- Be respectful and constructive in issues, reviews, and discussions.

## Reporting Bugs

Please open an issue using the [bug template](.github/ISSUE_TEMPLATE/bug.md) and include:

- A clear, descriptive title
- What you expected to happen
- What actually happened
- Steps to reproduce the problem
- Minimal reproducible code or repository, when possible
- Relevant logs, error messages, screenshots, and environment details

Environment details should include the commit, operating system, `bun --version`, and browser version when relevant.

## Suggesting Features

Feature requests are welcome — use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md) and explain:

- The problem or use case
- Your proposed solution
- Alternatives you considered
- Any compatibility, performance, security, or maintenance tradeoffs

Avoid starting a large implementation before maintainers have had a chance to comment on the proposal.

## Development Setup

The fastest way to get the project running is [`git0`](https://www.npmjs.com/package/git0) — it downloads the repo, detects the project type, installs dependencies with Bun, and opens your editor in one step:

```bash
npx git0 debate/debate-ai.com
```

`git0` downloads a source snapshot without `.git` history, which is ideal for trying the project out. To submit a pull request you need a real git clone of your own fork:

1. Fork the repository and clone your fork.
2. Create a branch from `master`.
3. Install dependencies with Bun.
4. Run the project locally and confirm the existing tests pass.

```bash
git clone https://github.com/YOUR-USERNAME/debate-ai.com.git
cd debate-ai.com
git checkout -b feat/short-description

bun install          # installs every workspace package
bun run dev          # starts the full dev pipeline via turbo
bun run test         # runs the Vitest suite
```

Requires [Bun](https://bun.sh) 1.3.11 or newer (`packageManager` pins the exact version).

Useful filtered targets:

```bash
bun run dev:web      # just the debate-ai.com web app
bun run dev:editor   # just the reason-editor package
```

## Making Changes

- Keep changes focused; avoid unrelated refactors in the same pull request.
- Match the existing code style, naming conventions, and project architecture.
- Keep package boundaries clean — import from a package's public entry point rather than reaching into its internals.
- Add or update tests for behavior changes and bug fixes.
- Update documentation, examples, and types when applicable.
- Do not commit secrets, credentials, API keys, private keys, generated build output, or unrelated `bun.lock` changes.
- Write clear commit messages that describe the change.

## Testing

Before opening a pull request, run the relevant checks locally — these are the same commands CI runs:

```bash
bun run typecheck    # turbo typecheck across the workspace
bun run test         # Vitest
bun run coverage     # Vitest with coverage (reported to Codecov in CI)
bun run build        # turbo build
```

If you cannot run a check, state that clearly in the pull request and explain why.

## Pull Requests

When opening a pull request:

- Target the `master` branch.
- Use a concise title that describes the user-visible change.
- Explain what changed and why.
- Link related issues using `Fixes #123` or `Closes #123` when appropriate.
- Include test results and any manual verification steps.
- Include screenshots or recordings for user-interface changes.
- Keep the pull request small enough to review effectively.
- Respond to review feedback constructively and update the branch as requested.

### Pull Request Template

```md
## Summary

- What does this change do?

## Motivation

- What problem does it solve?

## Testing

- [ ] Tests added or updated
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes
- [ ] `bun run build` passes
- [ ] Manual testing completed

## Screenshots / Notes

- Add screenshots, migration notes, or rollout considerations if relevant.
```

## Documentation

Documentation changes are valuable contributions. Please keep examples accurate, use clear language, and update the pages under [`docs/`](docs) when behavior or configuration changes.

## License

By contributing, you agree that your contributions will be licensed under the same license as this repository (PROSPER 1.0.0, see [LICENSE.md](LICENSE.md)).

## Questions

If you are unsure where to start, open a discussion or issue describing what you would like to work on. Maintainers can help identify an appropriate next step.
