# Documentation

Three surfaces, each with a different owner. Putting something in the wrong one
is the most common documentation mistake here.

| If it is… | It goes in… |
| --- | --- |
| How to *use* a published package | That package's `README.md` (prose below the generated header) |
| How an agent should work on a package | That package's `CLAUDE.md` |
| Deep, task-shaped guidance for an agent *using* the package | `skills/<name>/SKILL.md` |
| A guide for the docs site | `apps/dev-tools-help-docs/content/docs` |
| Repo-wide agent orientation | root `CLAUDE.md` + `.claude/architecture/` |

There is deliberately **no root `docs/` folder**.

## The skills convention

[`skills/`](../../skills/) carries one [Agent
Skill](https://docs.claude.com/en/docs/agents-and-tools/agent-skills/overview)
per package: a `SKILL.md` with setup, the calls worth knowing, recipes and a
troubleshooting table — plus an `API.md` for packages with a surface large
enough to need one.

Each skill is written **from the package's source, not its README**, which is
the whole point: the troubleshooting rows cover the real gotchas — flags the
README gets wrong, exports that live on a subpath, stubs that return success
unconditionally. Do not regenerate a skill from a README; that throws away the
only thing it has that the README doesn't.

Users install them with:

```bash
npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent
npx skills@latest add https://github.com/OpenSourceAGI/dev-tools-starter-agent --skill manage-storage
```

The `--skill` name is the **skill** name, which matches neither the directory
nor always the npm name — the mapping table is in
[`skills/README.md`](../../skills/README.md), and each package README carries
its own correct command in the generated header.

**When public behaviour changes, update the skill in the same PR.** The skills
are what agents actually load; a stale one is worse than a missing one.

## The docs site — `apps/dev-tools-help-docs`

Next.js + Fumadocs, deployed to starterdocs.vtempest.workers.dev. AI chat,
full-text search, and an auto-generated API reference built from TypeScript
types and OpenAPI specs.

```bash
bun run docs:sync     # from the root — pulls package READMEs into the site
cd apps/dev-tools-help-docs && bun run dev
```

Build is staged: `build:pre` → `next build` → `build:post` (`build:full` runs
all three). `postinstall` runs `fumadocs-mdx`, so a missing content type after a
fresh clone usually means that did not run.

**`apps/dev-tools-help-docs` is the one Biome workspace.** `check`, `lint`,
`format` here are Biome; nothing else in the repo is formatted by it, and there
is no repo-wide formatter. Do not run Biome outside `apps/dev-tools-help-docs`.
It also has its own `commitlint.config.ts` and a cspell config.

`code-tree-graph` is what renders the dependency graphs and type tables on that
site — a change to its component props shows up in the docs build, not in its
own tests.
