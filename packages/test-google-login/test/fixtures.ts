/**
 * Shared fixtures: one realistic storage state, and fakes standing in for a
 * Puppeteer page, a Durable Object's storage and Playwright's fixtures.
 *
 * The fakes record what they were called with, because most of what is worth
 * asserting in this package is *ordering* and *what was not sent* — cookies
 * before navigation, no password in an evaluate source, no cookie value in an
 * HTTP response.
 */
import type { PuppeteerCookie, StorageState } from "../src/types.js";

/** A fixed "now" so every expiry assertion is deterministic. 2026-09-12T00:00:00Z. */
export const NOW_MS = Date.UTC(2026, 8, 12, 0, 0, 0);
export const NOW_SECONDS = Math.floor(NOW_MS / 1000);

export const HOUR = 3600;

/**
 * A state file shaped like one a real Google sign-in produces: the app's own
 * session cookie, a Google `SID`, a session-only CSRF cookie, and an access token
 * in the app origin's localStorage.
 */
export function sampleState(overrides: Partial<StorageState> = {}): StorageState {
  return {
    cookies: [
      {
        name: "app_session",
        value: "sess_abcdef0123456789",
        domain: "app.example.test",
        path: "/",
        expires: NOW_SECONDS + 12 * HOUR,
        httpOnly: true,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "SID",
        value: "google-sid-value-xyz",
        domain: ".google.com",
        path: "/",
        expires: NOW_SECONDS + 48 * HOUR,
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
      {
        name: "csrf",
        value: "csrf-token-0001",
        domain: "app.example.test",
        path: "/",
        expires: -1,
        httpOnly: false,
        secure: true,
        sameSite: "Strict",
      },
    ],
    origins: [
      {
        origin: "https://app.example.test",
        localStorage: [
          { name: "access_token", value: "ya29.a0AfH6SMB-token" },
          { name: "theme", value: "dark" },
        ],
      },
    ],
    ...overrides,
  };
}

export interface RecordedCall {
  method: string;
  args: unknown[];
}

/** A Puppeteer-ish page that records everything and keeps a localStorage map. */
export class FakePage {
  readonly calls: RecordedCall[] = [];
  readonly cookiesSet: PuppeteerCookie[] = [];
  readonly storage = new Map<string, Map<string, string>>();
  /** Elements `document.querySelector` should find, keyed by selector. */
  readonly selectors = new Map<string, unknown>();

  private currentUrl = "about:blank";
  private readonly failOn: Set<string>;
  private readonly gotoRedirects: Map<string, string>;

  constructor(options: { failOn?: string[]; redirects?: Record<string, string>; cookies?: PuppeteerCookie[] } = {}) {
    this.failOn = new Set(options.failOn ?? []);
    this.gotoRedirects = new Map(Object.entries(options.redirects ?? {}));
    if (options.cookies) this.cookiesSet.push(...options.cookies);
  }

  private record(method: string, ...args: unknown[]) {
    this.calls.push({ method, args });
  }

  /** The order of operations, as method names. The assertion that matters most. */
  get callOrder(): string[] {
    return this.calls.map((call) => call.method);
  }

  async goto(url: string, options?: Record<string, unknown>): Promise<{ status: () => number }> {
    this.record("goto", url, options);
    if (this.failOn.has(url)) throw new Error(`net::ERR_CONNECTION_REFUSED at ${url}`);
    this.currentUrl = this.gotoRedirects.get(url) ?? url;
    return { status: () => 200 };
  }

  url(): string {
    return this.currentUrl;
  }

  async title(): Promise<string> {
    return "Dashboard — Example";
  }

  async setCookie(...cookies: PuppeteerCookie[]): Promise<void> {
    this.record("setCookie", cookies);
    this.cookiesSet.push(...cookies);
  }

  async cookies(): Promise<PuppeteerCookie[]> {
    this.record("cookies");
    return this.cookiesSet;
  }

  /**
   * Run the page function against this fake's own storage.
   *
   * The functions under test are written to run in a browser, so the fake provides
   * just enough `window.localStorage` and `document` for them to execute for real
   * — which means the tests exercise the actual page code, not a description of it.
   */
  async evaluate<T>(fn: (...args: never[]) => T, ...args: unknown[]): Promise<T> {
    this.record("evaluate", ...args);

    // `new URL("about:blank").origin` is the string "null", which is exactly what a
    // browser reports for an opaque origin — and writing storage there throws.
    const origin = originOf(this.currentUrl);
    if (this.currentUrl === "about:blank" || origin === "null") {
      throw new Error("SecurityError: localStorage is not available on an opaque origin");
    }

    const map = this.storage.get(origin) ?? new Map<string, string>();
    this.storage.set(origin, map);

    const previousWindow = (globalThis as Record<string, unknown>).window;
    const previousDocument = (globalThis as Record<string, unknown>).document;

    // A Proxy rather than a plain object, because the real `localStorage` exposes
    // its keys as enumerable own properties while `setItem`/`getItem` live on the
    // prototype. Spreading the methods onto the object would make
    // `Object.keys(localStorage)` return "setItem" — and `extractStorageState`
    // would faithfully capture it.
    const fakeLocalStorage = new Proxy({} as Record<string, unknown>, {
      get(_target, property: string) {
        switch (property) {
          case "setItem":
            return (key: string, value: string) => map.set(key, String(value));
          case "getItem":
            return (key: string) => map.get(key) ?? null;
          case "removeItem":
            return (key: string) => map.delete(key);
          case "clear":
            return () => map.clear();
          case "length":
            return map.size;
          case "key":
            return (index: number) => [...map.keys()][index] ?? null;
          default:
            return map.get(property);
        }
      },
      has: (_target, property: string) => map.has(property),
      ownKeys: () => [...map.keys()],
      getOwnPropertyDescriptor: (_target, property: string) =>
        map.has(property)
          ? { value: map.get(property), enumerable: true, configurable: true, writable: true }
          : undefined,
    });

    (globalThis as Record<string, unknown>).window = { localStorage: fakeLocalStorage };
    (globalThis as Record<string, unknown>).document = {
      querySelector: (selector: string) => (this.selectors.has(selector) ? this.selectors.get(selector) : null),
    };

    try {
      return (fn as (...a: unknown[]) => T)(...args);
    } finally {
      (globalThis as Record<string, unknown>).window = previousWindow;
      (globalThis as Record<string, unknown>).document = previousDocument;
    }
  }

  async screenshot(): Promise<Uint8Array> {
    this.record("screenshot");
    return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  }

  async close(): Promise<void> {
    this.record("close");
  }

  localStorageFor(origin: string): Record<string, string> {
    return Object.fromEntries(this.storage.get(origin) ?? new Map());
  }
}

/**
 * A recording stand-in for a DOM element, enough for the page functions in
 * `worker.ts` to run for real: `click`, `focus`, `value` and `dispatchEvent`.
 *
 * `onClick` is where a test models what the click does to the page — a Google
 * sign-in is several navigations, and the condition `waitForUrlContaining` polls
 * for is the last one of them.
 */
export function fakeElement(onClick?: () => void) {
  const element = {
    value: "",
    clicks: 0,
    focused: 0,
    events: [] as string[],
    click() {
      element.clicks += 1;
      onClick?.();
    },
    focus() {
      element.focused += 1;
    },
    dispatchEvent(event: { type: string }) {
      element.events.push(event.type);
      return true;
    },
  };

  return element;
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/** A Durable Object storage that also records alarm scheduling. */
export class FakeStorage {
  readonly map = new Map<string, unknown>();
  readonly alarms: number[] = [];

  async get<T>(key: string): Promise<T | undefined> {
    return this.map.get(key) as T | undefined;
  }

  async put(key: string, value: unknown): Promise<void> {
    // Structured-clone like the real thing, so a test cannot accidentally assert
    // against an object the DO still holds a reference to.
    this.map.set(key, JSON.parse(JSON.stringify(value)));
  }

  async delete(key: string): Promise<boolean> {
    return this.map.delete(key);
  }

  async setAlarm(time: number): Promise<void> {
    this.alarms.push(time);
  }
}

/** A browser that hands out one page and records closing. */
export class FakeBrowser {
  closed = false;
  readonly pages: FakePage[] = [];

  constructor(private readonly pageFactory: () => FakePage = () => new FakePage()) {}

  async newPage(): Promise<FakePage> {
    const page = this.pageFactory();
    this.pages.push(page);
    return page;
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  isConnected(): boolean {
    return !this.closed;
  }
}
