# CLAUDE.md — `server-shell-setup`

**Not a workspace.** No `package.json`, no build, no test runner — turbo and
`bun install` ignore this directory entirely. It sits under `packages/` for
discoverability only.

**skill:** [`skills/server-shell-setup`](../../skills/server-shell-setup/SKILL.md)

Plain shell scripts for bootstrapping a server:

| Script | Does |
| --- | --- |
| `install-shell.sh` | The bootstrap installer — components, fish aliases |
| `get-node.sh` | Installs Node |
| `clean-server-disk.sh` | Reclaims disk on a full server |
| `misc-setup/` | Assorted one-off setup snippets |

## Rules

- **These run as a human's first command on a fresh box, often as root.** Be
  conservative: no `rm -rf` on a variable that can be empty, quote every
  expansion, `set -eu` at the top, and check before overwriting a dotfile.
- `clean-server-disk.sh` deletes things. Every path it removes must be one the
  script itself can justify — never widen a glob to free more space.
- There is no CI here. Anything you change is shipped untested by definition;
  read it twice and say in the PR that you could not run it.
