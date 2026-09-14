# Starter Templates

`starter-templates/` holds six scaffolds that users copy out. They are **not
workspaces** — `bun install` does not install them, turbo does not build them,
and no test runs against them.

```
starter-templates/
  template-docusaurus/
  template-fumadocs/
  template-git-repo/
  template-nextjs-betterauth-shadcn-drizzle/
  template-svelte-betterauth-shadcn-drizzle/
  template-vinext-betterauth-shadcn-themes-teams-stripe/
```

## How a template is selected

`packages/create-starter-app/bin/create-starter-app.js` holds a **hardcoded
list** of template descriptors (`id`, `label`, `parts`, `devNotes`) and copies
the chosen one out of:

```js
const STARTERS_DIR = join(__dirname, "../../../starter-templates");
```

That relative path resolves to the repo-root `starter-templates/` — so the CLI
only finds templates when it is running **from inside this monorepo**.

## Two drifts to know about before you touch this

Neither is fixed as of this writing; both are the kind of thing that looks like
your change broke something when it did not.

1. **The CLI's id list and the directory listing disagree.** The CLI offers
   `template-nextjs-betterauth-shadcn-prisma` (no such directory) and
   `template-svelte-betterauth-drizzle-shadcn` (the directory is
   `template-svelte-betterauth-shadcn-drizzle` — different word order). It does
   *not* offer `template-git-repo` or
   `template-vinext-betterauth-shadcn-themes-teams-stripe`, which do exist.
   Picking a drifted entry fails at the copy step.
2. **The published package cannot reach the templates.** `package.json` declares
   `files: ["bin", "starters"]` — there is no `starters/` directory in the
   package, and `starter-templates/` is three levels above the installed `bin/`,
   outside the tarball. Inside the monorepo the path resolves; installed from
   npm it does not.

If you are asked to add a template, the change is **two places**: the directory
*and* the descriptor list in the CLI. If you are asked to fix the published
CLI, that is a real bug with a real decision behind it (vendor the templates
into the tarball, or fetch them from GitHub) — raise it rather than guessing.

## `template-git-repo` is different

The directory `starter-templates/template-git-repo/` is a scaffold. The
**package** `packages/template-git-repo/` is something else entirely: the badge
and README catalog that `.github/scripts/sync-package-readmes.mjs` and
`packages/setup-git-repo` both build on. Same name, different things — check
which one you are in.
