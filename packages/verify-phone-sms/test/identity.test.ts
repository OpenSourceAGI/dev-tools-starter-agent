import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../src/identity-verification-server';

/**
 * The identity service fans out to three TrestleIQ endpoints (phone, person,
 * location) and scores what comes back. `fetch` is stubbed per endpoint, so
 * each test describes a world — "valid mobile, exact name match, active
 * address" — and asserts the score, questions and recommendations that follow.
 */
type Json = Record<string, unknown>;
type World = { phone?: Json | number; person?: Json | number; location?: Json | number };

const BODY = {
  phone_number: '2069735100',
  legal_name: 'John Smith',
  current_address: {
    street_line_1: '123 Main St',
    city: 'Seattle',
    state_code: 'WA',
    postal_code: '98101',
  },
};

let fetchMock: ReturnType<typeof vi.fn>;
let envKey: string | undefined;

function world(w: World) {
  fetchMock.mockImplementation(async (input: string) => {
    const path = new URL(input).pathname;
    const pick = path.endsWith('/phone') ? w.phone : path.endsWith('/person') ? w.person : w.location;
    if (typeof pick === 'number') return new Response('err', { status: pick, statusText: 'Boom' });
    return new Response(JSON.stringify(pick ?? {}), { status: 200 });
  });
}

const verify = (body: unknown = BODY) =>
  app.request('/verify-identity', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  envKey = process.env.TRESTLE_API_KEY;
  process.env.TRESTLE_API_KEY = 'trestle-key';
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (envKey === undefined) delete process.env.TRESTLE_API_KEY;
  else process.env.TRESTLE_API_KEY = envKey;
});

const GOOD_PHONE = {
  is_valid: true,
  line_type: 'Mobile',
  is_commercial: false,
  owners: [
    {
      name: 'John Smith',
      addresses: [
        { street_line_1: '1 Old Rd', city: 'Tacoma', state_code: 'WA' },
        { street_line_1: '', city: 'x', state_code: 'WA' },
      ],
      phones: [{ phone_number: '2065550001' }, { phone_number: '2065550002' }, {}],
    },
    { name: 'Johnny Smythe' },
  ],
};
const GOOD_PERSON = {
  person: [
    {
      name: 'John Smith',
      addresses: [{ street_line_1: '9 Elm St', city: 'Everett', state_code: 'WA' }],
      phones: [{ phone_number: '2065550003' }],
    },
  ],
};
const GOOD_LOCATION = {
  is_valid: true,
  is_active: true,
  is_commercial: false,
  current_residents: [{ name: 'Jane Smith' }, { name: 'John Smith' }, {}],
};

describe('POST /verify-identity', () => {
  it('scores a fully corroborated identity at 100 with a high-confidence note', async () => {
    world({ phone: GOOD_PHONE, person: GOOD_PERSON, location: GOOD_LOCATION });
    const res = await verify();
    expect(res.status).toBe(200);
    const json: any = await res.json();

    expect(json.verification_score).toBe(100);
    expect(json.name_match_found).toBe(true);
    expect(json.phone_validated).toBe(true);
    expect(json.address_validated).toBe(true);
    expect(json.recommendations).toEqual(['High confidence verification - proceed with confidence']);
  });

  it('queries all three TrestleIQ endpoints with the API key and hints', async () => {
    world({});
    await verify({ ...BODY, current_address: { ...BODY.current_address, street_line_2: 'Apt 4' } });

    const urls = fetchMock.mock.calls.map((c) => new URL(c[0] as string));
    expect(urls.map((u) => u.pathname).sort()).toEqual(['/3.1/location', '/3.1/person', '/3.2/phone']);
    const phone = urls.find((u) => u.pathname === '/3.2/phone')!;
    expect(phone.searchParams.get('phone')).toBe('2069735100');
    expect(phone.searchParams.get('phone.country_hint')).toBe('US');
    expect(phone.searchParams.get('phone.name_hint')).toBe('John Smith');
    expect(phone.searchParams.get('phone.postal_code_hint')).toBe('98101');
    const loc = urls.find((u) => u.pathname === '/3.1/location')!;
    expect(loc.searchParams.get('street_line_2')).toBe('Apt 4');
    expect(loc.searchParams.get('country_code')).toBe('US');
    expect(fetchMock.mock.calls[0][1].headers['x-api-key']).toBe('trestle-key');
  });

  it('builds address, phone and name questions from the history', async () => {
    world({ phone: GOOD_PHONE, person: GOOD_PERSON, location: GOOD_LOCATION });
    const json: any = await (await verify()).json();

    expect(json.historical_data.previous_addresses).toEqual(
      expect.arrayContaining(['1 Old Rd, Tacoma, WA', '9 Elm St, Everett, WA']),
    );
    expect(json.historical_data.previous_phones).toEqual(
      expect.arrayContaining(['2065550001', '2065550002', '2065550003']),
    );
    expect(json.historical_data.associated_names).toEqual(
      expect.arrayContaining(['John Smith', 'Johnny Smythe', 'Jane Smith']),
    );

    const byType = Object.fromEntries(json.questions.map((q: any) => [q.type, q]));
    expect(Object.keys(byType).sort()).toEqual(['address_history', 'name_verification', 'phone_history']);
    expect(byType.address_history.options).toHaveLength(4); // 2 real + 2 fake
    expect(byType.phone_history.options).toContain('None of the above');
    expect(byType.name_verification.options).toContain('Johnny Smythe');
    expect(byType.name_verification.options).not.toContain('John Smith');
    expect(byType.address_history.id).toMatch(/^addr_\d+$/);
  });

  it('gives a partial-name match 20 points', async () => {
    world({
      phone: { is_valid: false },
      person: { person: [{ name: 'John Doe' }] },
      location: { is_valid: false },
    });
    const json: any = await (await verify()).json();
    expect(json.verification_score).toBe(20);
    expect(json.name_match_found).toBe(false);
  });

  it('low scores ask for ID documents and flag invalid phone/address', async () => {
    world({ phone: { is_valid: false }, person: {}, location: { is_valid: false } });
    const json: any = await (await verify()).json();
    expect(json.verification_score).toBe(0);
    expect(json.recommendations).toEqual([
      'Consider requesting additional identification documents',
      'Verify identity through alternative methods (government ID, utility bills)',
      'Request alternative contact phone number',
      'Verify current address with utility bill or bank statement',
    ]);
    expect(json.questions).toEqual([]);
  });

  it('mid scores ask for more questions or standard processing', async () => {
    // valid phone (15) + Landline (10) + commercial (0) + partial name (20) = 45
    world({
      phone: { is_valid: true, line_type: 'Landline', is_commercial: true, owners: [{ name: 'John Doe' }] },
      location: { is_valid: true, is_active: false, is_commercial: true },
    });
    let json: any = await (await verify()).json();
    // + address valid (15) = 60
    expect(json.verification_score).toBe(60);
    expect(json.recommendations).toEqual(['Proceed with standard verification process']);

    world({ phone: { is_valid: true, owners: [{ name: 'John Doe' }] }, location: {} });
    json = await (await verify()).json();
    // valid (15) + not commercial (5) + partial (20) = 40
    expect(json.verification_score).toBe(40);
    expect(json.recommendations).toEqual([
      'Request additional verification questions',
      'Consider manual review of provided information',
      'Verify current address with utility bill or bank statement',
    ]);
  });

  it('flags VOIP numbers', async () => {
    world({ phone: { is_valid: true, line_type: 'NonFixedVOIP' } });
    const json: any = await (await verify()).json();
    expect(json.recommendations).toContain('VOIP number detected - consider additional verification');
  });

  it('tolerates individual upstream failures', async () => {
    world({ phone: 500, person: GOOD_PERSON, location: 403 });
    const res = await verify();
    expect(res.status).toBe(200);
    const json: any = await res.json();
    expect(json.name_match_found).toBe(true);
    expect(json.phone_validated).toBe(false);
    expect(json.address_validated).toBe(false);
  });

  it('rejects an invalid body with a 400', async () => {
    const res = await verify({ phone_number: '123', legal_name: '' });
    expect(res.status).toBe(400);
  });

  it('returns a 500 with the reason when the API key is not configured', async () => {
    delete process.env.TRESTLE_API_KEY;
    const res = await verify();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: 'Failed to verify identity',
      message: 'TRESTLE_API_KEY environment variable is required',
    });
  });

  it('caps history lists (10 addresses, 5 phones, 10 names)', async () => {
    const owners = [
      {
        name: 'A',
        addresses: Array.from({ length: 15 }, (_, i) => ({ street_line_1: `${i} St`, city: 'C', state_code: 'WA' })),
        phones: Array.from({ length: 9 }, (_, i) => ({ phone_number: `20655500${i}0` })),
      },
      ...Array.from({ length: 14 }, (_, i) => ({ name: `N${i}` })),
    ];
    world({ phone: { owners } });
    const json: any = await (await verify()).json();
    expect(json.historical_data.previous_addresses).toHaveLength(10);
    expect(json.historical_data.previous_phones).toHaveLength(5);
    expect(json.historical_data.associated_names).toHaveLength(10);
  });
});

describe('other routes', () => {
  it('GET /health', async () => {
    const res = await app.request('/health');
    const json: any = await res.json();
    expect(json.status).toBe('healthy');
    expect(new Date(json.timestamp).getTime()).not.toBeNaN();
  });

  it('GET /doc serves the OpenAPI document', async () => {
    const json: any = await (await app.request('/doc')).json();
    expect(json.openapi).toBe('3.0.0');
    expect(json.info.title).toBe('Identity Verification API');
    expect(json.paths['/verify-identity'].post.summary).toBe('Verify person identity');
  });

  it('GET /swagger serves the Swagger UI page', async () => {
    const res = await app.request('/swagger');
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toContain("url: '/doc'");
  });

  it('GET /demo runs a sample verification', async () => {
    world({ phone: GOOD_PHONE, person: GOOD_PERSON, location: GOOD_LOCATION });
    const json: any = await (await app.request('/demo')).json();
    expect(json.demo_request.legal_name).toBe('John Smith');
    expect(json.demo_response.verification_score).toBe(100);
    expect(json.note).toContain('demo');
  });

  it('GET /demo explains how to fix a missing key', async () => {
    delete process.env.TRESTLE_API_KEY;
    const json: any = await (await app.request('/demo')).json();
    expect(json.error).toContain('check your TRESTLE_API_KEY');
  });

  it('answers CORS preflight', async () => {
    const res = await app.request('/verify-identity', {
      method: 'OPTIONS',
      headers: { origin: 'https://x.example', 'access-control-request-method': 'POST' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});
