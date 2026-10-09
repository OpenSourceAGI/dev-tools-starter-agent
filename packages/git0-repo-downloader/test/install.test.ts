import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { installDependencies } from '../src/install.ts';
import { installFakeShell, type FakeShell } from './helpers/fake-shell.ts';

describe('installDependencies', () => {
  let cwd: string;
  let project: string;
  let fake: FakeShell;

  const touch = (...names: string[]) => {
    for (const n of names) fs.writeFileSync(path.join(project, n), '');
  };

  beforeEach(() => {
    cwd = process.cwd();
    project = fs.mkdtempSync(path.join(os.tmpdir(), 'git0-install-'));
  });

  afterEach(() => {
    process.chdir(cwd);
    fake?.restore();
    fs.rmSync(project, { recursive: true, force: true });
  });

  test('changes into the target directory', async () => {
    fake = installFakeShell();
    await installDependencies(project);
    expect(fs.realpathSync(process.cwd())).toBe(fs.realpathSync(project));
  });

  test('runs nothing for an empty project', async () => {
    fake = installFakeShell({ available: ['bun'] });
    await installDependencies(project);
    expect(fake.commands).toEqual([]);
  });

  test('uses bun for a Node project when bun is available', async () => {
    fake = installFakeShell({ available: ['bun'] });
    touch('package.json');
    await installDependencies(project);
    expect(fake.commands).toEqual(['bun install', 'bun run dev; bun run start']);
  });

  test('falls back to npm for a Node project when bun is missing', async () => {
    fake = installFakeShell();
    touch('package.json');
    await installDependencies(project);
    expect(fake.probes).toEqual(['bun']);
    expect(fake.commands).toEqual(['npm install', 'npm run dev; npm run start']);
  });

  test('probes with `where` on Windows', async () => {
    fake = installFakeShell({ available: ['bun'] });
    touch('package.json');
    const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;
    Object.defineProperty(process, 'platform', { value: 'win32' });
    try {
      await installDependencies(project);
    } finally {
      Object.defineProperty(process, 'platform', platform);
    }
    expect(fake.probes).toEqual(['bun']);
    expect(fake.commands[0]).toBe('bun install');
  });

  test('prefers docker-compose over a bare Dockerfile', async () => {
    fake = installFakeShell();
    touch('Dockerfile', 'docker-compose.yml');
    await installDependencies(project);
    expect(fake.commands).toEqual(['sudo docker-compose up -d']);
  });

  test('builds the image when only a Dockerfile exists', async () => {
    fake = installFakeShell();
    touch('Dockerfile');
    await installDependencies(project);
    expect(fake.commands).toEqual(['sudo docker build -t project .']);
  });

  test('does nothing for docker-compose.yml alone being removed mid-run', async () => {
    fake = installFakeShell();
    touch('docker-compose.yml');
    await installDependencies(project);
    expect(fake.commands).toEqual(['sudo docker-compose up -d']);
  });

  test('sets up a venv and installs requirements.txt', async () => {
    fake = installFakeShell();
    touch('requirements.txt');
    await installDependencies(project);
    expect(fake.commands).toEqual([
      'python -m venv .venv',
      'source .venv/bin/activate',
      'pip install -r requirements.txt',
    ]);
  });

  test('installs a setup.py project in editable mode', async () => {
    fake = installFakeShell();
    touch('setup.py');
    await installDependencies(project);
    expect(fake.commands).toEqual([
      'python -m venv .venv',
      'source .venv/bin/activate',
      'pip install -e .',
    ]);
  });

  test('builds Rust and Go projects', async () => {
    fake = installFakeShell();
    touch('Cargo.toml', 'go.mod');
    await installDependencies(project);
    expect(fake.commands).toEqual(['cargo build', 'go mod tidy']);
  });

  test('keeps going when an install command fails', async () => {
    fake = installFakeShell({ failing: ['cargo'] });
    touch('Cargo.toml', 'go.mod');
    await installDependencies(project);
    expect(fake.commands).toEqual(['cargo build', 'go mod tidy']);
  });

  test('handles a polyglot project in detector order', async () => {
    fake = installFakeShell({ available: ['bun'] });
    touch('package.json', 'go.mod');
    await installDependencies(project);
    expect(fake.commands).toEqual(['bun install', 'bun run dev; bun run start', 'go mod tidy']);
  });
});
