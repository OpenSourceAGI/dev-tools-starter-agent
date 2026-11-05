import fs from 'fs';
import os from 'os';
import path from 'path';
import { shell } from '../utils.js';

/**
 * Registers the git0 service with the OS so it starts at login and keeps
 * running, and registers the `git0://` URL scheme where the OS allows a CLI to.
 *
 * It is a **per-user** service on every platform, not a system-wide daemon:
 * the whole job ends in launching a desktop app, and only a process inside the
 * user's session can do that. It also means no admin rights to install.
 *
 * | OS | Runs as | URL scheme |
 * | --- | --- | --- |
 * | Linux | `systemd --user` unit | `.desktop` handler + `xdg-mime` |
 * | macOS | LaunchAgent | not registered — macOS delivers URLs by Apple Event to app bundles only; buttons use the HTTP endpoint |
 * | Windows | Scheduled task at logon | `HKCU\Software\Classes\git0` |
 */

/** Paths and command the service files are generated from. */
export interface ServiceSpec {
  /** Absolute path of the runtime (`process.execPath`). */
  runtime: string;
  /** Absolute path of the git0 entry script. */
  script: string;
  port: number;
  home?: string;
}

export const SERVICE_LABEL = 'org.git0.service';
const TASK_NAME = 'git0-service';

/** `systemd --user` unit. Restarts on failure; `default.target` starts it at login. */
export function systemdUnit(spec: ServiceSpec): string {
  return `[Unit]
Description=git0 background install service
After=network-online.target

[Service]
ExecStart="${spec.runtime}" "${spec.script}" --service --port=${spec.port}
Restart=on-failure
RestartSec=3

[Install]
WantedBy=default.target
`;
}

/** The `.desktop` entry that makes git0 the handler for `git0://` links on Linux. */
export function desktopEntry(spec: ServiceSpec): string {
  return `[Desktop Entry]
Type=Application
Name=git0
Comment=Install GitHub releases from download links
Exec="${spec.runtime}" "${spec.script}" %u
NoDisplay=true
Terminal=false
MimeType=x-scheme-handler/git0;
`;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** macOS LaunchAgent: runs at load, restarted if it exits. */
export function launchAgentPlist(spec: ServiceSpec): string {
  const logDir = path.join(spec.home ?? os.homedir(), 'Library', 'Logs');
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${SERVICE_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(spec.runtime)}</string>
    <string>${xml(spec.script)}</string>
    <string>--service</string>
    <string>--port=${spec.port}</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>${xml(path.join(logDir, 'git0-service.log'))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(logDir, 'git0-service.log'))}</string>
</dict>
</plist>
`;
}

/** Windows: commands that create the logon task and the `git0://` protocol keys. */
export function windowsCommands(spec: ServiceSpec): string[] {
  const run = `\\"${spec.runtime}\\" \\"${spec.script}\\" --service --port=${spec.port}`;
  const open = `\\"${spec.runtime}\\" \\"${spec.script}\\" \\"%1\\"`;
  return [
    `schtasks /Create /F /SC ONLOGON /RL LIMITED /TN ${TASK_NAME} /TR "${run}"`,
    `reg add "HKCU\\Software\\Classes\\git0" /ve /d "URL:git0 Protocol" /f`,
    `reg add "HKCU\\Software\\Classes\\git0" /v "URL Protocol" /d "" /f`,
    `reg add "HKCU\\Software\\Classes\\git0\\shell\\open\\command" /ve /d "${open}" /f`,
  ];
}

/** Where each OS's service file lives. */
export function serviceFiles(home = os.homedir()) {
  return {
    systemdUnit: path.join(home, '.config', 'systemd', 'user', 'git0.service'),
    desktopEntry: path.join(home, '.local', 'share', 'applications', 'git0-handler.desktop'),
    launchAgent: path.join(home, 'Library', 'LaunchAgents', `${SERVICE_LABEL}.plist`),
  };
}

function run(cmd: string, quiet = false): boolean {
  try {
    shell.execSync(cmd, { stdio: quiet ? 'ignore' : 'inherit' });
    return true;
  } catch {
    return false;
  }
}

function write(file: string, content: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

/**
 * Installs and starts the service for the current user. Returns lines to
 * print — what was written, and anything that needs the user.
 */
export function installSystemService(spec: ServiceSpec, platform = process.platform): string[] {
  const files = serviceFiles(spec.home);
  const out: string[] = [];

  if (platform === 'linux') {
    write(files.systemdUnit, systemdUnit(spec));
    out.push(`Wrote ${files.systemdUnit}`);
    const started = run('systemctl --user daemon-reload', true) && run('systemctl --user enable --now git0.service', true);
    out.push(started
      ? 'Started git0.service (systemctl --user status git0)'
      : 'systemd --user is not available here — run `git0 --service` from your session startup instead');

    write(files.desktopEntry, desktopEntry(spec));
    run(`xdg-mime default git0-handler.desktop x-scheme-handler/git0`, true);
    run(`update-desktop-database ${JSON.stringify(path.dirname(files.desktopEntry))}`, true);
    out.push('Registered git0:// links');
    return out;
  }

  if (platform === 'darwin') {
    write(files.launchAgent, launchAgentPlist(spec));
    run(`launchctl unload ${JSON.stringify(files.launchAgent)}`, true);
    out.push(run(`launchctl load -w ${JSON.stringify(files.launchAgent)}`, true)
      ? `Loaded LaunchAgent ${SERVICE_LABEL}`
      : `Wrote ${files.launchAgent} — load it with launchctl load -w`);
    out.push('git0:// links are not registered on macOS; buttons reach the service over HTTP');
    return out;
  }

  if (platform === 'win32') {
    for (const cmd of windowsCommands(spec)) run(cmd, true);
    out.push(`Created logon task ${TASK_NAME} and registered git0:// links`);
    out.push(run(`schtasks /Run /TN ${TASK_NAME}`, true) ? 'Started the service' : 'Will start at next logon');
    return out;
  }

  throw new Error(`Installing as a service is not supported on ${platform}`);
}

/** Stops the service and removes everything {@link installSystemService} added. */
export function uninstallSystemService(platform = process.platform, home = os.homedir()): string[] {
  const files = serviceFiles(home);

  if (platform === 'linux') {
    run('systemctl --user disable --now git0.service', true);
    fs.rmSync(files.systemdUnit, { force: true });
    fs.rmSync(files.desktopEntry, { force: true });
    run('systemctl --user daemon-reload', true);
    return ['Removed git0.service and the git0:// handler'];
  }
  if (platform === 'darwin') {
    run(`launchctl unload -w ${JSON.stringify(files.launchAgent)}`, true);
    fs.rmSync(files.launchAgent, { force: true });
    return [`Removed LaunchAgent ${SERVICE_LABEL}`];
  }
  if (platform === 'win32') {
    run(`schtasks /End /TN ${TASK_NAME}`, true);
    run(`schtasks /Delete /F /TN ${TASK_NAME}`, true);
    run(`reg delete "HKCU\\Software\\Classes\\git0" /f`, true);
    return [`Removed task ${TASK_NAME} and the git0:// handler`];
  }
  throw new Error(`Not supported on ${platform}`);
}
