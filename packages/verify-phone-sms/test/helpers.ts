/**
 * Shared test helpers.
 *
 * Both outbound calls this package makes — the AWS SNS `Publish` request and
 * the sent.dm phone lookup — go through `fetch`. Stubbing `fetch` keeps the
 * suite offline and deterministic; without it the VoIP tests hit a public API
 * that rate-limits (HTTP 429) and the send tests hit SNS with fake credentials.
 */

import { vi } from 'vitest';

export const TEST_API_KEY = 'test-api-key';
export const TEST_MESSAGE_ID = 'test-message-id-0001';

/** The subset of an SNS `Publish` response that `parseXMLResponse` reads. */
const snsPublishOk = `<?xml version="1.0"?>
<PublishResponse xmlns="http://sns.amazonaws.com/doc/2010-03-31/">
  <PublishResult><MessageId>${TEST_MESSAGE_ID}</MessageId></PublishResult>
</PublishResponse>`;

export interface NetworkStubOptions {
  /** What the phone lookup should report the number as. */
  lookup?: 'voip' | 'cellular' | 'landline' | 'none';
  /** Make the phone lookup fail with this status instead of answering. */
  lookupStatus?: number;
}

/**
 * Replace `globalThis.fetch` for the duration of a test. Any URL the package
 * is not expected to call fails the test rather than escaping to the network.
 */
export function stubNetwork(options: NetworkStubOptions = {}) {
  const { lookup = 'cellular', lookupStatus } = options;

  const lookupBodies = {
    voip: { carrier: { name: 'Bandwidth', type: 'voip' }, portability: { line_type: 'landline' } },
    cellular: { carrier: { name: 'Verizon Wireless', type: 'cellular' }, portability: { line_type: 'landline' } },
    landline: { carrier: { name: 'AT&T', type: 'landline' }, portability: { line_type: 'landline' } },
    none: null,
  } as const;

  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.includes('amazonaws.com')) {
      return new Response(snsPublishOk, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    if (url.includes('sent.dm/api/phone-lookup')) {
      if (lookupStatus) {
        return new Response('rate limited', { status: lookupStatus });
      }
      return new Response(JSON.stringify(lookupBodies[lookup]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    throw new Error(`Unexpected network call in tests: ${url}`);
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** Build a JSON POST request carrying the given auth headers. */
export function apiRequest(
  path: string,
  body: unknown,
  headers: Record<string, string> = { 'X-API-Key': TEST_API_KEY },
) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}
