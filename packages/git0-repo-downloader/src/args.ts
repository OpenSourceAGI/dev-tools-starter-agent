import chalk from 'chalk';

/**
 * The flags git0 accepts, and what they mean.
 *
 * Kept to a handful on purpose — the common case is one argument and no flags.
 */
export interface Flags {
  /** `--path=<p>` — limit the download to one folder or file of the repo. */
  path?: string;
  /** `--branch=<ref>` — download a branch, tag or commit other than the default. */
  branch?: string;
  /** `--history` — also attach the full `.git` history, in the background. */
  history: boolean;
  /** `--history-only` — clone only the history, no working files. */
  historyOnly: boolean;
  /** `--mirror` — use `--mirror` rather than `--bare` when cloning history. */
  mirror: boolean;
}

/**
 * Splits `process.argv` into positional arguments and flags.
 *
 * Deliberately hand-rolled rather than pulled in: git0's surface is one
 * positional argument and five flags, and the argument itself is frequently a
 * URL, which most parsers are keen to mangle.
 *
 * @param argv - Arguments after the node binary and script name.
 * @returns The positional arguments and the parsed flags.
 *
 * @example
 * parseArgs(['facebook/react', '--history', '--path=packages/react-dom']);
 * // → { positional: ['facebook/react'],
 * //     flags: { history: true, path: 'packages/react-dom', … } }
 */
export function parseArgs(argv: string[]): { positional: string[]; flags: Flags } {
  const positional: string[] = [];
  const flags: Flags = { history: false, historyOnly: false, mirror: false };

  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    const [name, ...rest] = arg.slice(2).split('=');
    const value = rest.join('=');

    if (name === 'path') flags.path = value;
    else if (name === 'branch' || name === 'ref') flags.branch = value;
    else if (name === 'history' || name === 'git') flags.history = true;
    else if (name === 'history-only' || name === 'git-only') flags.historyOnly = true;
    else if (name === 'mirror') flags.mirror = true;
    else console.log(chalk.yellow(`Ignoring unknown flag: ${arg}`));
  }

  return { positional, flags };
}
