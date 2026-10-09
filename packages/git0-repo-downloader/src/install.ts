import fs from 'fs';
import { exec, shell } from './utils.js';

/**
 * A detector checks whether a specific project type is present in the current
 * working directory by looking for a characteristic file.
 *
 * @internal
 */
type Detector = () => boolean;

/**
 * An installer runs the appropriate package manager or build tool for a
 * detected project type.
 *
 * @internal
 */
type Installer = () => void;

/**
 * Returns true when the `bun` binary is available on `PATH`.
 *
 * Uses `where` on Windows and `command -v` on Unix. Throws when not found
 * (callers catch this to fall back to npm).
 *
 * @internal
 */
function bunAvailable(): boolean {
  try {
    shell.execSync(
      process.platform === 'win32' ? 'where bun' : 'command -v bun',
      { stdio: 'ignore' }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Installs Node.js dependencies and starts the dev/start script.
 *
 * Prefers `bun` when available; falls back to `npm`. Runs `dev` first and
 * `start` as a fallback in the same shell invocation — both are expected to
 * fail gracefully when the script doesn't exist.
 *
 * @internal
 */
function installNode(): void {
  if (bunAvailable()) {
    exec('bun install');
    exec('bun run dev; bun run start');
  } else {
    exec('npm install');
    exec('npm run dev; npm run start');
  }
}

/**
 * Starts a Docker project using Compose if `docker-compose.yml` is present,
 * otherwise builds a plain Docker image from `Dockerfile`.
 *
 * @internal
 */
function installDocker(): void {
  if (fs.existsSync('docker-compose.yml')) {
    exec('sudo docker-compose up -d');
  } else if (fs.existsSync('Dockerfile')) {
    exec('sudo docker build -t project .');
  }
}

/**
 * Creates a Python virtualenv, activates it, and installs dependencies.
 *
 * Installs from `requirements.txt` and/or `setup.py` depending on which
 * files exist. The `source .venv/bin/activate` call is a no-op on Windows
 * (where the command is not available) but is harmless to include.
 *
 * @internal
 */
function installPython(): void {
  exec('python -m venv .venv');
  exec('source .venv/bin/activate');
  if (fs.existsSync('requirements.txt')) exec('pip install -r requirements.txt');
  if (fs.existsSync('setup.py'))         exec('pip install -e .');
}

/**
 * Project-type detectors keyed by ecosystem name.
 * Each function returns `true` when it recognises the current directory.
 *
 * @internal
 */
const DETECTORS: Record<string, Detector> = {
  nodejs: () => fs.existsSync('package.json'),
  docker: () => fs.existsSync('Dockerfile') || fs.existsSync('docker-compose.yml'),
  python: () => fs.existsSync('requirements.txt') || fs.existsSync('setup.py'),
  rust:   () => fs.existsSync('Cargo.toml'),
  go:     () => fs.existsSync('go.mod'),
};

/**
 * Per-ecosystem install handlers, keyed to match {@link DETECTORS}.
 *
 * @internal
 */
const INSTALLERS: Record<string, Installer> = {
  nodejs: installNode,
  docker: installDocker,
  python: installPython,
  rust:   () => exec('cargo build'),
  go:     () => exec('go mod tidy'),
};

/**
 * Detects the project type(s) in `targetDir` and runs the appropriate
 * dependency installer(s).
 *
 * A directory can match multiple project types simultaneously (e.g. a Node.js
 * project that also has a Dockerfile). All matched installers are run in order.
 *
 * Supported ecosystems:
 * | Ecosystem | Detection file         | Install command           |
 * |-----------|------------------------|---------------------------|
 * | Node.js   | `package.json`         | `bun install` / `npm i`   |
 * | Docker    | `Dockerfile` / Compose | `docker-compose up -d`    |
 * | Python    | `requirements.txt`     | `pip install -r …`        |
 * | Rust      | `Cargo.toml`           | `cargo build`             |
 * | Go        | `go.mod`               | `go mod tidy`             |
 *
 * @param targetDir - Absolute path to the project root to install into.
 *   The function changes the process working directory to this path before
 *   running any commands.
 *
 * @example
 * await installDependencies('/home/user/projects/my-node-app');
 * // Detects package.json → runs bun install && bun run dev
 */
export async function installDependencies(targetDir: string): Promise<void> {
  process.chdir(targetDir);

  for (const [name, detect] of Object.entries(DETECTORS)) {
    if (detect()) INSTALLERS[name]?.();
  }
}
