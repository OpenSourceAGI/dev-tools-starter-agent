import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CookieConsent from '../src/react/CookieConsent';
import {
  COOKIE_CONSENT_STORAGE_KEY,
  clearCookieConsent,
  readCookieConsent,
  writeCookieConsent,
} from '../src/index';

/**
 * Enough of `localStorage` for the helpers, since this package's suite runs in
 * `node` rather than jsdom. `throwOn` covers the browser that refuses storage
 * when site data is blocked — the case the helpers must survive.
 */
function stubStorage(throwOn?: 'get' | 'set' | 'remove') {
  const entries = new Map<string, string>();
  const refuse = () => {
    throw new DOMException('denied', 'SecurityError');
  };

  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (throwOn === 'get' ? refuse() : (entries.get(k) ?? null)),
    setItem: (k: string, v: string) => {
      if (throwOn === 'set') refuse();
      entries.set(k, v);
    },
    removeItem: (k: string) => {
      if (throwOn === 'remove') refuse();
      entries.delete(k);
    },
  });

  return entries;
}

beforeEach(() => {
  stubStorage();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cookie consent storage', () => {
  it('reads back nothing until a decision is recorded', () => {
    expect(readCookieConsent()).toBeNull();
  });

  it('records accept-all and essential-only as their category sets', () => {
    expect(writeCookieConsent('all')).toMatchObject({
      analytics: true,
      marketing: true,
      functional: true,
    });
    expect(readCookieConsent()).toMatchObject({ analytics: true, marketing: true });

    expect(writeCookieConsent('essential')).toMatchObject({
      analytics: false,
      marketing: false,
      functional: true,
    });
    expect(readCookieConsent()).toMatchObject({ analytics: false, functional: true });
  });

  it('stamps the decision with the time it was made', () => {
    const before = Date.now();
    const stamped = Date.parse(writeCookieConsent('all').timestamp);

    expect(stamped).toBeGreaterThanOrEqual(before);
    expect(stamped).toBeLessThanOrEqual(Date.now());
  });

  it('keeps each storage key separate', () => {
    writeCookieConsent('all', 'other-app-consent');

    expect(readCookieConsent()).toBeNull();
    expect(readCookieConsent('other-app-consent')).toMatchObject({ analytics: true });
  });

  it('treats a malformed record as no decision rather than throwing', () => {
    const entries = stubStorage();

    entries.set(COOKIE_CONSENT_STORAGE_KEY, 'not json');
    expect(readCookieConsent()).toBeNull();

    entries.set(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ marketing: true }));
    expect(readCookieConsent()).toBeNull();
  });

  it('fills in a missing timestamp rather than dropping the decision', () => {
    stubStorage().set(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify({ analytics: true }));

    expect(readCookieConsent()).toMatchObject({ analytics: true, marketing: false, functional: true });
    expect(Date.parse(readCookieConsent()!.timestamp)).toBe(0);
  });

  it('forgets a decision so the banner asks again', () => {
    writeCookieConsent('all');
    clearCookieConsent();

    expect(readCookieConsent()).toBeNull();
  });

  it('survives a browser that refuses storage', () => {
    stubStorage('get');
    expect(readCookieConsent()).toBeNull();

    stubStorage('set');
    expect(writeCookieConsent('all')).toMatchObject({ analytics: true });

    stubStorage('remove');
    expect(() => clearCookieConsent()).not.toThrow();
  });

  it('reads as no decision where there is no storage at all', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(readCookieConsent()).toBeNull();
    expect(writeCookieConsent('essential')).toMatchObject({ analytics: false });
  });
});

describe('<CookieConsent />', () => {
  it('renders nothing on the server, so a cached page never shows a stale banner', () => {
    expect(renderToStaticMarkup(<CookieConsent appName="Acme" />)).toBe('');
  });
});
