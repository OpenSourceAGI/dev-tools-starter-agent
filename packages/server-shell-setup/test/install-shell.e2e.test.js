// Real install of every `all` component, then proof from inside each shell
// that the tools and helper functions are reachable. It installs system
// packages and sets the root and user passwords, so it only runs when
// SERVER_SHELL_SETUP_E2E=1 — on a throwaway GitHub Actions Ubuntu runner.
import { randomBytes } from 'node:crypto'
import { homedir, userInfo } from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { run, SCRIPT } from './helpers.js'

const enabled = process.env.SERVER_SHELL_SETUP_E2E === '1'
const HOME = homedir()
const USER = userInfo().username
const NU_CONFIG = path.join(HOME, '.config/nushell/config.nu')

// A login-like environment: nothing inherited from the CI runner's PATH, so a
// tool only counts as installed if the shell's own config puts it on PATH.
const cleanEnv = {
  HOME,
  USER,
  TERM: 'dumb',
  PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
}

const shells = {
  bash: (cmd) => run('bash', ['-ic', cmd], { env: cleanEnv }),
  fish: (cmd) => run('fish', ['-c', cmd], { env: cleanEnv }),
  nu: (cmd) => run('nu', ['--config', NU_CONFIG, '-c', cmd], { env: cleanEnv }),
}

// Commands every shell must resolve after `--components all`.
const TOOLS = [
  'git', 'gh', 'curl', 'wget', 'fzf', 'rg', 'jq', 'lsof',
  'fish', 'nu', 'nvim', 'hx', 'yazi', 'starship',
  'node', 'npm', 'pnpm', 'yarn', 'bun', 'pacstall',
]

// apt packages the installer itself asks for on Debian/Ubuntu.
const APT_PACKAGES = [
  'git', 'gh', 'wget', 'curl', 'fzf', 'ripgrep', 'jq', 'unzip', 'python3',
  'python3-pip', 'util-linux', 'lsof', 'xz-utils', 'fish', 'neovim', 'file',
]

describe.runIf(enabled)('install-shell.sh --components all (e2e)', () => {
  let install

  beforeAll(() => {
    install = run('bash', [SCRIPT, '--components', 'all', '--yes'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, SETUP_PASSWORD: randomBytes(12).toString('hex') },
    })
    process.stdout.write(install.output)
  })

  it('finishes successfully', () => {
    expect(install.status).toBe(0)
    expect(install.stdout).toContain('Installation Complete')
  })

  it.each(APT_PACKAGES)('apt package %s is installed', (pkg) => {
    expect(run('dpkg', ['-s', pkg]).status).toBe(0)
  })

  it.each(['root', USER])('%s has a usable password', (account) => {
    const { stdout } = run('sudo', ['passwd', '-S', account])
    expect(stdout.trim().split(/\s+/)[1]).toBe('P')
  })

  for (const [shell, exec] of Object.entries(shells)) {
    describe(shell, () => {
      it.each(TOOLS)(`resolves %s`, (tool) => {
        const cmd = shell === 'nu' ? `which ${tool} | length` : `command -v ${tool}`
        const { status, stdout } = exec(cmd)
        expect(status, `${shell} could not find ${tool}`).toBe(0)
        if (shell === 'nu') expect(stdout.trim()).toBe('1')
      })

      it('runs node 22 through Volta', () => {
        const { status, stdout } = exec(`node -p "process.version + ' ' + process.execPath"`)
        expect(status).toBe(0)
        expect(stdout).toMatch(/^v22\./)
        expect(stdout).toContain('.volta')
      })

      it('runs bun and starship', () => {
        expect(exec('bun --version').status).toBe(0)
        expect(exec('starship --version').status).toBe(0)
      })
    })
  }

  it('defines the fish helper functions', () => {
    const fns = ['in', 'e', 'del', 'search', 'killport', 'service_manager', 'setup', 'systeminfo', 'y']
    for (const fn of fns) {
      expect(shells.fish(`functions -q ${fn}`).status, `fish function ${fn}`).toBe(0)
    }
  })

  it('defines the bash helper functions', () => {
    expect(shells.bash('type y && type systeminfo').status).toBe(0)
  })

  it('defines the nushell helper commands', () => {
    const { stdout } = shells.nu('scope commands | where name in [y systeminfo] | length')
    expect(stdout.trim()).toBe('2')
  })

  it('verifies each tool reports a version', () => {
    for (const cmd of ['fish --version', 'nu --version', 'nvim --version', 'hx --version', 'yazi --version']) {
      expect(shells.bash(cmd).status, cmd).toBe(0)
    }
  })
})
