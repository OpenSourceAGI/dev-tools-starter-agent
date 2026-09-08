import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// `src/generate.js` is CommonJS, and its `require('fs')`/`require('sharp')`
// calls bypass Vitest's module mocking. Rather than stub them, the suite runs
// the generator against a real temp directory and asserts on what it wrote.
const require = createRequire(import.meta.url);
const generateApp = require('../src/generate.js');

describe('generateApp', () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'web2mobile-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it('generates app files in the specified output directory', async () => {
    const outputDir = path.join(tmp, 'test-output');

    await generateApp({
      name: 'Test App',
      url: 'https://example.com',
      outputDir,
    });

    expect(fs.existsSync(outputDir)).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'assets'))).toBe(true);

    const appJs = fs.readFileSync(path.join(outputDir, 'App.js'), 'utf8');
    expect(appJs).toContain('https://example.com');
    expect(appJs).not.toContain('__URL__');

    const appJson = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'app.json'), 'utf8'),
    );
    expect(appJson.expo.name).toBe('Test App');
    expect(appJson.expo.slug).toBe('test-app');
  });

  it('uses the supplied package name for the android/ios identifiers', async () => {
    const outputDir = path.join(tmp, 'named');

    await generateApp({
      name: 'Test App',
      url: 'https://example.com',
      outputDir,
      packageName: 'com.acme.testapp',
    });

    const appJson = fs.readFileSync(path.join(outputDir, 'app.json'), 'utf8');
    expect(appJson).toContain('com.acme.testapp');
    expect(appJson).not.toContain('__PACKAGE_NAME__');
  });

  it('writes placeholder icons when no icon is provided', async () => {
    const outputDir = path.join(tmp, 'icons');

    await generateApp({
      name: 'Test App',
      url: 'https://example.com',
      outputDir,
    });

    const assets = path.join(outputDir, 'assets');
    for (const icon of ['icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png']) {
      expect(fs.existsSync(path.join(assets, icon))).toBe(true);
    }
  });

  it('generates eas.json only when eas is requested', async () => {
    const withEas = path.join(tmp, 'with-eas');
    const withoutEas = path.join(tmp, 'without-eas');

    await generateApp({
      name: 'Test App',
      url: 'https://example.com',
      outputDir: withEas,
      eas: true,
    });
    await generateApp({
      name: 'Test App',
      url: 'https://example.com',
      outputDir: withoutEas,
    });

    expect(fs.existsSync(path.join(withEas, 'eas.json'))).toBe(true);
    expect(fs.existsSync(path.join(withoutEas, 'eas.json'))).toBe(false);
  });

  it('rejects when no config is provided and config.json is absent', async () => {
    const cwd = process.cwd();
    process.chdir(tmp);
    try {
      await expect(generateApp()).rejects.toThrow(
        'No config provided and config.json not found',
      );
    } finally {
      process.chdir(cwd);
    }
  });
});
