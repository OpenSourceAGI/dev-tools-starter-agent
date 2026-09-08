import { describe, test, expect } from 'vitest';
import GithubAPI from '../src/github-api.ts';

describe('GithubAPI.parseURL', () => {
  const api = new GithubAPI();

  test('parses full https github.com URL', () => {
    const result = api.parseURL('https://github.com/facebook/react');
    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.owner).toBe('facebook');
    expect(result.name).toBe('react');
  });

  test('parses owner/repo shorthand', () => {
    const result = api.parseURL('vitejs/vite');
    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.owner).toBe('vitejs');
    expect(result.name).toBe('vite');
  });

  test('parses SSH git@ URL', () => {
    const result = api.parseURL('git@github.com:torvalds/linux.git');
    expect(result).not.toBe(false);
  });

  test('parses git:// protocol URL', () => {
    const result = api.parseURL('git://github.com/user/repo.git');
    expect(result).not.toBe(false);
  });

  test('returns false for a plain search query', () => {
    expect(api.parseURL('react starter template')).toBe(false);
  });

  test('returns false for a single word', () => {
    expect(api.parseURL('react')).toBe(false);
  });

  test('returns false for an email-like string', () => {
    expect(api.parseURL('user@example.com')).toBe(false);
  });

  test('owner/repo with dots in repo name is accepted', () => {
    const result = api.parseURL('sass/node-sass.git');
    expect(result).not.toBe(false);
  });

  test('owner/repo with hyphens is accepted', () => {
    const result = api.parseURL('my-org/my-repo');
    expect(result).not.toBe(false);
    if (!result) return;
    expect(result.name).toBe('my-repo');
  });
});

describe('GithubAPI.getCurrentPlatform', () => {
  const api = new GithubAPI();

  test('returns an object with os, arch, platform, architecture fields', () => {
    const p = api.getCurrentPlatform();
    expect(p).toHaveProperty('os');
    expect(p).toHaveProperty('arch');
    expect(p).toHaveProperty('platform');
    expect(p).toHaveProperty('architecture');
  });

  test('os is one of the known canonical values or a passthrough', () => {
    const p = api.getCurrentPlatform();
    expect(typeof p.os).toBe('string');
    expect(p.os.length).toBeGreaterThan(0);
  });

  test('platform matches process.platform', () => {
    const p = api.getCurrentPlatform();
    expect(p.platform).toBe(process.platform);
  });
});
