import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

export const SCRIPT = fileURLToPath(new URL('../install-shell.sh', import.meta.url))

/** Run a command and return { status, stdout, stderr, output }. */
export function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', ...options })
  if (result.error) throw result.error
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    output: `${result.stdout}\n${result.stderr}`,
  }
}
