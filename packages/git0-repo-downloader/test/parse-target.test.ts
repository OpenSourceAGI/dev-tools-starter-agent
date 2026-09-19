import { describe, test, expect } from 'vitest';
import { parseTarget } from '../src/github-api.ts';

describe('parseTarget', () => {
  test('parses a plain repository URL', () => {
    const target = parseTarget('https://github.com/facebook/react');
    expect(target).toMatchObject({
      owner: 'facebook',
      name: 'react',
      href: 'https://github.com/facebook/react',
      subPath: '',
      subPathType: '',
    });
  });

  test('parses owner/repo shorthand', () => {
    expect(parseTarget('vitejs/vite')).toMatchObject({
      owner: 'vitejs',
      name: 'vite',
      subPath: '',
    });
  });

  test('reads branch and folder out of a /tree/ URL', () => {
    expect(parseTarget('https://github.com/facebook/react/tree/main/packages/react-dom'))
      .toMatchObject({
        owner: 'facebook',
        name: 'react',
        ref: 'main',
        subPath: 'packages/react-dom',
        subPathType: 'tree',
      });
  });

  test('reads branch and file out of a /blob/ URL', () => {
    expect(
      parseTarget(
        'https://github.com/debate/debate-ai.com/blob/master/.continue/agents/new-config.yaml'
      )
    ).toMatchObject({
      owner: 'debate',
      name: 'debate-ai.com',
      ref: 'master',
      subPath: '.continue/agents/new-config.yaml',
      subPathType: 'blob',
    });
  });

  test('takes a path off the owner/repo shorthand too', () => {
    expect(parseTarget('facebook/react/packages/react-dom')).toMatchObject({
      owner: 'facebook',
      name: 'react',
      subPath: 'packages/react-dom',
      subPathType: '',
    });
  });

  test('canonicalizes href to the repository root, not the deep link', () => {
    const target = parseTarget('https://github.com/facebook/react/tree/main/packages/react-dom');
    expect(target && target.href).toBe('https://github.com/facebook/react');
  });

  test('unwraps the fork chain GitHub puts in the owner', () => {
    expect(parseTarget('https://github.com/upstream/fork/repo')).toMatchObject({
      owner: 'fork',
    });
  });

  test('returns false for a search query', () => {
    expect(parseTarget('react starter template')).toBe(false);
    expect(parseTarget('react')).toBe(false);
  });
});
