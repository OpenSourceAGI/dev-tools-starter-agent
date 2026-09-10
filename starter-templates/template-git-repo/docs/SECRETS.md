# Secrets and settings CI depends on

Repository secrets live at **Settings → Secrets and variables → Actions → New
repository secret**. Names are case-sensitive and must match exactly.

| Secret | Used by | Required? | Where it comes from |
| --- | --- | --- | --- |
| `CODECOV_TOKEN` | `tests.yml` | For coverage and Test Analytics | codecov.io → your repo → Settings → General → Repository Upload Token |
| `NPM_TOKEN` | `npm-publish.yml` | Only if you are not using trusted publishing | npmjs.com → Access Tokens → Generate → **Granular**, write access to the packages |
| `CLOUDFLARE_API_TOKEN` | `deploy-test-reports.yml` | For the report deploy | dash.cloudflare.com → My Profile → API Tokens → "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | `deploy-test-reports.yml` | For the report deploy | Cloudflare dashboard → Workers & Pages → the id in the right sidebar (or the URL) |
| `GIT_TOKEN` | both auto-merge workflows | For auto-merge | github.com → Settings → Developer settings → Personal access tokens |

`GITHUB_TOKEN` is provided automatically — never create a secret with that name;
GitHub rejects it.

## Which workflows you can run without any secrets

`tests.yml` still runs the suites without `CODECOV_TOKEN`; only the two upload
steps fail, and both are `fail_ci_if_error: false`, so the job stays green while
you set the token up. Everything else needs its secret to do anything at all.

## GIT_TOKEN scopes

A fine-grained personal access token, scoped to this repository, with:

- **Contents**: Read and write
- **Pull requests**: Read and write

A classic token needs `repo` (and `workflow` if the merged PRs ever touch
`.github/workflows`).

**Why not `GITHUB_TOKEN`?** Merges made with `GITHUB_TOKEN` do not trigger
further workflows — an [intentional loop guard][loop]. With it, a PR merged by
the auto-merge workflow would never fire `npm-publish.yml` or
`deploy-test-reports.yml` on the default branch. A PAT is a real user, so its
pushes trigger workflows normally.

The tradeoff: that token carries whatever access its owner has. Prefer a
fine-grained token limited to this one repository, and set an expiry you will
actually notice.

[loop]: https://docs.github.com/en/actions/security-for-github-actions/security-guides/automatic-token-authentication#using-the-github_token-in-a-workflow

## npm: trusted publishing instead of a token

Preferred, because there is nothing to rotate. Per package, on npmjs.com:

1. Go to `npmjs.com/package/<name>/access`.
2. Under **Trusted publisher**, add: GitHub Actions, this `owner/repo`, workflow
   file `npm-publish.yml`.
3. Leave `NPM_TOKEN` **unset** in the repo. The workflow detects the absence and
   authenticates via OIDC — that is what `permissions: id-token: write` is for.

A package's *first* publish cannot use trusted publishing (there is no package
page yet to configure). Publish once by hand — `npm publish --access public` —
then set the trusted publisher and let CI take over.

## Repository settings, not secrets

| Setting | Where | Needed for |
| --- | --- | --- |
| Allow auto-merge | Settings → General → Pull Requests | `gh pr merge --auto` in both auto-merge workflows |
| Branch protection with ≥1 required check | Settings → Branches | Makes `--auto` actually wait for CI instead of merging immediately |
| Read and write permissions for Actions | Settings → Actions → General → Workflow permissions | The version-bump commit in `npm-publish.yml` |
| Allow GitHub Actions to create and approve pull requests | Settings → Actions → General | `gh pr create` in `auto-merge-and-create-prs.yml` |

## Rotation

- `NPM_TOKEN`: granular tokens expire after **90 days maximum**. The workflow's
  preflight step turns an expired token into a clear error instead of a
  late `E404`, but it still stops the release. Trusted publishing avoids this
  entirely.
- `GIT_TOKEN`: set an expiry and a calendar reminder. An expired PAT makes the
  auto-merge workflows fail with `gh: Bad credentials`.
- `CLOUDFLARE_API_TOKEN`: does not expire unless you set a TTL, but scope it to
  Workers Scripts:Edit on one account rather than using a global API key.
