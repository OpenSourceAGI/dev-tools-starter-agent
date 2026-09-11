# Publishing

Most packages here publish to npm independently. Private ones:
`native-app-wrapper`, `web2mobile-wrapper` (`create-mobile-wrapper`), and every
app except `vscode-cloud`.

## The workflow

`.github/workflows/npm-publish.yml`, on push to `master`.

It does three unusual things, all for reasons worth preserving:

1. **It upgrades npm first.** Node 22 ships npm 10, which cannot do OIDC
   trusted publishing.
2. **It tests its own publish scripts before using them.** Publishing is not
   reversible, so the code that decides version numbers is exercised first.
3. **It asks the registry what to publish** rather than bumping blindly —
   `.github/scripts/resolve-publish-version.mjs` resolves the next version from
   what npm already has. The version-bump commit at the end of the job is
   **best-effort**: if a run fails after publishing, the repo falls behind npm,
   and a blind `npm version patch` would then produce an already-published
   version and fail *every* package. Resolving from the registry is what makes a
   partially-failed run recoverable.

## Credentials

Two paths, in order of preference:

- **Trusted publishing (OIDC)** — no secret at all; configure the repo +
  workflow as a trusted publisher on npmjs.com per package.
- **`NPM_TOKEN` secret** — an automation/granular token with read+write.

A rejected credential surfaces as **`E404 Not Found - PUT`**, not 403 — npm
answers 404 when a token cannot write a package. The workflow detects this and
prints the fix, so a wall of E404s means "the token is wrong", not "the package
name is wrong".

## Generated README headers

The top of every `packages/*/README.md` — the badge row and the
`npx skills@latest add … --skill <name>` line — is **generated** by
`scripts/sync-package-readmes.mjs`.

```bash
bun run readmes          # write
bun run readmes:check    # fail if anything is stale (this is what CI runs)
```

Why it is generated rather than pasted:

- The root README's badges describe the *repo* (stars, commit activity, the
  monorepo's coverage). Pasted into a package README they say nothing about that
  package — the download count belongs to whatever package the block last
  advertised, and the coverage number mixes in sixteen others. Each package gets
  a row built from its own manifest instead.
- Badges whose inputs are missing are **omitted, not rendered broken** — a
  private package gets the two that still mean something; an unflagged package
  gets no coverage badge.
- The skill-install line differs per package (`--skill <name>`); pasting is
  exactly how a README ends up telling you to install a different package's
  skill.

**Edit the prose below the generated header, never the header itself.** The
badge catalog and the skipping rule both live in `packages/template-git-repo`.

## Versioning

Bump the package's own version in its `package.json` when you change published
behaviour. Version-bump commits made by CI are generated — do not write them by
hand.
