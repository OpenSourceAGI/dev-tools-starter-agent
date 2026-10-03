import { shell } from '../../src/utils.ts';

/**
 * Replaces the CLI's process-spawning seam (see `shell` in src/utils.ts) with a
 * recorder, so install and IDE-launch logic can be observed without running
 * anything. Works under both `vitest` and `bun test`.
 */
export interface FakeShell {
  /** Commands run through `execSync`, excluding availability probes. */
  commands: string[];
  /** Availability probes (`command -v x` / `where x`), by tool name. */
  probes: string[];
  /** `spawn` calls as `[cmd, args]`. */
  spawned: Array<[string, string[]]>;
  restore(): void;
}

export function installFakeShell(
  opts: { available?: string[]; failing?: string[] } = {}
): FakeShell {
  const { available = [], failing = [] } = opts;
  const original = { execSync: shell.execSync, spawn: shell.spawn };
  const fake: FakeShell = { commands: [], probes: [], spawned: [], restore() {} };

  (shell as any).execSync = (cmd: string) => {
    const probe = cmd.match(/^(?:command -v|where) (\S+)$/);
    if (probe) {
      fake.probes.push(probe[1]);
      if (!available.includes(probe[1])) throw new Error(`${probe[1]}: not found`);
      return Buffer.from('');
    }
    fake.commands.push(cmd);
    if (failing.some((f) => cmd.startsWith(f))) throw new Error(`${cmd}: failed`);
    return Buffer.from('');
  };

  (shell as any).spawn = (cmd: string, args: string[]) => {
    fake.spawned.push([cmd, args]);
    return { unref() {} };
  };

  fake.restore = () => {
    (shell as any).execSync = original.execSync;
    (shell as any).spawn = original.spawn;
  };
  return fake;
}
