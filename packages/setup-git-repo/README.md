# setup-git-repo

One command to give a repository the whole GitHub setup: Turborepo, the CI
workflows, the README badge block, and the docs explaining every part of it.

```bash
bunx setup-git-repo          # or: npx setup-git-repo
```

Run it inside the repo you want to set up. Owner, repo name and default branch
are read from `git remote get-url origin`; the optional badges are prompted for
and left out if you skip them.

## What it writes

```
.github/workflows/tests.yml                   auto-discovering test matrix → Codecov
.github/workflows/npm-publish.yml             publishes packages whose content changed
.github/workflows/deploy-test-reports.yml     HTML test report → Cloudflare Workers
.github/workflows/auto-merge-claude.yml       auto-merge for agent and maintainer PRs
.github/workflows/auto-merge-and-create-prs.yml  twice-daily branch/PR sweep
.github/scripts/next-free-version.mjs         picks a version npm has not spent
turbo.json  package.json  vitest.config.ts    the Turborepo task graph
codecov.yml                                   flags, carryforward, comment layout
README.md                                     the badge block, filled in
docs/BADGES.md  docs/WORKFLOWS.md  docs/SECRETS.md
```

Existing files are never overwritten unless you pass `--force`, so it is safe to
run against a repo that already has some of this.

## Flags

Identity — detected from git when omitted:

| Flag | |
| --- | --- |
| `--owner <name>` | GitHub owner |
| `--repo <name>` | Repository name |
| `--branch <name>` | Default branch, used in every workflow's `branches:` filter |
| `--description <text>` | One-line description for the README |

Optional badges — a badge whose value you omit is dropped from the README
rather than shipped pointing at a placeholder:

| Flag | Badge |
| --- | --- |
| `--package <name>` | npm version + monthly downloads |
| `--doi <10.5281/zenodo.N>` | Zenodo DOI |
| `--docs <url>` / `--api <url>` / `--youtube <url>` | link badges |
| `--uptime <page-id>` | UptimeRobot status page |
| `--discord-id <id>` + `--discord-invite <url>` | Discord (both required) |

Behavior:

| Flag | |
| --- | --- |
| `--dir <path>` | Target directory (default: the current one) |
| `-n, --dry-run` | Print the plan, write nothing |
| `-f, --force` | Overwrite files that already exist |
| `-y, --yes` | Never prompt; use flags and git detection only |
| `--workflows-only` / `--badges-only` / `--docs-only` / `--turbo-only` | Write one part |
| `--template <path>` | Use a template directory other than the bundled one |

## Examples

```bash
# See what would land, without writing anything
bunx setup-git-repo --dry-run

# Non-interactive, for a script or an agent
bunx setup-git-repo -y --owner acme --repo widget --branch main --package widget-cli

# Add just the workflows to a repo that already has its own README
bunx setup-git-repo --workflows-only

# Refresh the badge block after the repo moved to a new owner
bunx setup-git-repo --badges-only --force --owner new-org
```

## After it runs

It prints the repository secrets and settings the workflows need —
`CODECOV_TOKEN`, `NPM_TOKEN` (or trusted publishing), the two Cloudflare values,
and `GIT_TOKEN` — plus the "Allow auto-merge" and branch-protection settings
that make `gh pr merge --auto` wait for CI instead of merging immediately.
`docs/SECRETS.md`, written into your repo, has the same list with where each
value comes from.

## Where the template lives

The single source of truth is
[`starter-templates/template-git-repo/`](../../starter-templates/template-git-repo)
in this monorepo. `prepack` copies it into `template/` inside the package so the
published tarball carries it, and the CLI checks that bundled copy first — a CLI
that only climbs out of its own package works in the repo and breaks the moment
it is installed from npm.

Its `.gitignore` is stored as `gitignore`, without the dot, because npm strips
`.gitignore` files out of published tarballs; the CLI restores the dot on write.

## Related skills

- [`ask-github-actions-setup`](../../skills/ask-github-actions-setup/SKILL.md) — the workflows: what each needs, how each fails
- [`ask-git-badges`](../../skills/ask-git-badges/SKILL.md) — the badge block: every badge's setup and failure modes
