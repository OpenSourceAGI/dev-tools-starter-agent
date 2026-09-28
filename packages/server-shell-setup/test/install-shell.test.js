// Fast checks that never change the machine: syntax, argument parsing, and the
// root/user password logic, all in --dry-run against a fixture shadow file.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir, userInfo } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { run, SCRIPT } from './helpers.js'

const SECRET = 'fixture-Pa55word'
const ROOT_UNSET = 'root:*:19000:0:99999:7:::\n'
const ROOT_LOCKED_EMPTY = 'root:!:19000:0:99999:7:::\n'
const ROOT_SET = 'root:$6$salt$hash:19000:0:99999:7:::\n'

let home

function installer(args, { shadow, env = {} } = {}) {
  const shadowFile = path.join(home, 'shadow')
  if (shadow !== undefined) writeFileSync(shadowFile, shadow)
  return run('bash', [SCRIPT, ...args], {
    // No terminal and an isolated HOME: this is the unattended path.
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      PATH: process.env.PATH,
      HOME: home,
      USER: userInfo().username,
      ...(shadow !== undefined ? { DEV_SETUP_SHADOW_FILE: shadowFile } : {}),
      ...env,
    },
  })
}

beforeEach(() => {
  home = mkdtempSync(path.join(tmpdir(), 'shell-setup-'))
})

afterEach(() => {
  rmSync(home, { recursive: true, force: true })
})

describe('install-shell.sh', () => {
  it('parses as bash', () => {
    expect(run('bash', ['-n', SCRIPT]).status).toBe(0)
  })

  it('documents the password options', () => {
    const { status, stdout } = installer(['--help'])
    expect(status).toBe(0)
    for (const flag of ['--root-password', '--user-password', '--password', 'SETUP_PASSWORD']) {
      expect(stdout).toContain(flag)
    }
  })

  it.each(['--root-password', '--user-password', '--password'])('%s requires a value', (flag) => {
    const { status, stderr } = installer([flag])
    expect(status).toBe(1)
    expect(stderr).toContain(`${flag} needs a value`)
  })

  it('rejects unknown components', () => {
    const { status, stderr } = installer(['--components', 'nope', '--dry-run'])
    expect(status).toBe(1)
    expect(stderr).toContain('Unknown component: nope')
  })
})

describe.skipIf(process.platform !== 'linux')('passwords (dry run)', () => {
  const isRoot = userInfo().username === 'root'

  it('sets an unset root password to the user password when automated', () => {
    const { status, output } = installer(
      ['--user-password', SECRET, '--dry-run', '--yes'],
      { shadow: ROOT_UNSET },
    )
    expect(status).toBe(0)
    if (!isRoot) expect(output).toContain('Root has no password; setting it to the user password.')
    expect(output).toContain('set password for root')
    expect(output).toContain('Passwords configured; no components were selected.')
    expect(output).not.toContain(SECRET)
  })

  it('treats a bare "!" as no password', () => {
    const { output } = installer(['--user-password', SECRET, '--dry-run'], { shadow: ROOT_LOCKED_EMPTY })
    expect(output).toContain('set password for root')
  })

  it.skipIf(isRoot)('sets the user password and leaves an existing root password alone', () => {
    const { status, output } = installer(['--user-password', SECRET, '--dry-run'], { shadow: ROOT_SET })
    expect(status).toBe(0)
    expect(output).toContain('Root already has a password.')
    expect(output).not.toContain('set password for root')
    expect(output).toContain(`set password for ${userInfo().username}`)
    expect(output).not.toContain(SECRET)
  })

  it('overwrites root when --root-password is explicit', () => {
    const { output } = installer(['--root-password', SECRET, '--dry-run'], { shadow: ROOT_SET })
    expect(output).toContain('set password for root')
    expect(output).not.toContain(SECRET)
  })

  it('--password sets both accounts', () => {
    const { output } = installer(['--password', SECRET, '--dry-run'], { shadow: ROOT_UNSET })
    expect(output).toContain('set password for root')
    if (!isRoot) expect(output).toContain(`set password for ${userInfo().username}`)
  })

  it('reads SETUP_PASSWORD from the environment', () => {
    const { output } = installer(['--dry-run', '--components', 'fish'], {
      shadow: ROOT_UNSET,
      env: { SETUP_PASSWORD: SECRET },
    })
    expect(output).toContain('set password for root')
    expect(output).not.toContain(SECRET)
  })

  it('reports an unset root password when none was given', () => {
    const { status, output } = installer(['--dry-run', '--components', 'fish'], { shadow: ROOT_UNSET })
    expect(status).toBe(0)
    expect(output).toContain('Dry run: root has no password')
  })

  it('rejects a password containing a line break', () => {
    const { status, stderr } = installer(['--password', 'a\nb', '--dry-run'], { shadow: ROOT_UNSET })
    expect(status).toBe(1)
    expect(stderr).toContain('must not contain a line break')
  })

  it('plans every "all" component without changing anything', () => {
    const { status, output } = installer(['--components', 'all', '--dry-run', '--yes'], { shadow: ROOT_SET })
    expect(status).toBe(0)
    for (const heading of ['Fish shell', 'Nushell', 'Neovim', 'Helix', 'Yazi', 'Node.js', 'Bun', 'Starship']) {
      expect(output).toContain(heading)
    }
  })
})
