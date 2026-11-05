import { shell } from '../utils.js';
import { openCommand } from './installer.js';
import { DEFAULT_PORT } from './server.js';

const base = (port: number) => `http://127.0.0.1:${port}`;

/** True when a git0 service answers on `port`. */
export async function isServiceRunning(port = DEFAULT_PORT, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetchImpl(`${base(port)}/health`, { signal: AbortSignal.timeout(800) });
    return res.ok && (await res.json())?.name === 'git0';
  } catch {
    return false;
  }
}

/**
 * Starts the service in the background when it is not already up, and waits
 * for it to answer. Used by the `git0://` handler so a link works even before
 * `--service=install` has been run.
 */
export async function ensureService(runtime: string, script: string, port = DEFAULT_PORT): Promise<boolean> {
  if (await isServiceRunning(port)) return true;
  const child = shell.spawn(runtime, [script, '--service', `--port=${port}`], { detached: true, stdio: 'ignore' }) as any;
  child?.on?.('error', () => { /* reported below as "could not start" */ });
  child?.unref?.();
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 250));
    if (await isServiceRunning(port)) return true;
  }
  return false;
}

/**
 * Hands an install request to the running service and opens its page in the
 * default browser — the approval prompt, or the progress bar for a trusted repo.
 */
export async function requestInstall(repo: string, port = DEFAULT_PORT): Promise<{ id: string; jobUrl: string }> {
  const res = await fetch(`${base(port)}/install`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `Service returned HTTP ${res.status}`);
  const open = openCommand(body.jobUrl);
  // On Linux `openCommand` runs the target itself; a URL needs xdg-open.
  const { cmd, args } = process.platform === 'linux' ? { cmd: 'xdg-open', args: [body.jobUrl] } : open;
  try {
    const child = shell.spawn(cmd, args, { detached: true, stdio: 'ignore' }) as any;
    child?.on?.('error', () => { /* no browser opener — the caller prints the URL */ });
    child?.unref?.();
  } catch { /* no browser — the URL is printed by the caller */ }
  return { id: body.id, jobUrl: body.jobUrl };
}

/** Every job the running service knows about. */
export async function listJobs(port = DEFAULT_PORT): Promise<any[]> {
  const res = await fetch(`${base(port)}/jobs`);
  return res.json();
}
