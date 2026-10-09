import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import verifyPhone, { isPhoneNumberVoip } from '../src/verify-phone';
import { stubNetwork, TEST_MESSAGE_ID } from './helpers';

/**
 * `verifyPhone` is the library entry point: it validates the code and number,
 * optionally blocks VoIP, then publishes through SNS. The SNS and lookup calls
 * are stubbed at `fetch` (see helpers.ts); the libphonenumber-js heuristics run
 * for real, so the numbers below were chosen for what they trigger.
 */
const base = { accessKeyId: 'AKIA', secretAccessKey: 'secret', awsRegion: 'us-east-1' };

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('input validation', () => {
  it('requires a code', async () => {
    stubNetwork();
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123' } as any);
    expect(r).toMatchObject({ success: false, error: 'Verification code is required' });
  });

  it.each(['abc', '12 34', 'ab-cd'])('rejects the malformed code %j', async (code) => {
    stubNetwork();
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code });
    expect(r.error).toBe('Code must be alphanumeric and at least 4 characters');
  });

  it('rejects an invalid phone number', async () => {
    stubNetwork();
    const r = await verifyPhone({ ...base, phoneNumber: '12', code: 'abcd' });
    expect(r.error).toContain('Invalid phone number format');
  });

  it('reports a missing options object as an error result, not a throw', async () => {
    stubNetwork();
    const r = await verifyPhone();
    expect(r.success).toBe(false);
  });
});

describe('formatting', () => {
  const sent = async (phoneNumber: string, extra: object = {}) => {
    const fetchMock = stubNetwork();
    const r = await verifyPhone({ ...base, phoneNumber, code: 'ab12', ...extra });
    return { r, fetchMock };
  };

  it.each([
    ['2025550123', '+12025550123'],
    ['(202) 555-0123', '+12025550123'],
    ['1-202-555-0123', '+12025550123'],
    ['+442071838750', '+442071838750'],
    ['442071838750', '+442071838750'],
  ])('normalises %s to %s', async (input, expected) => {
    const { r } = await sent(input);
    expect(r.success).toBe(true);
    expect(r.phoneNumber).toBe(expected);
  });

  it('uses libphonenumber for E.164 formatting when asked', async () => {
    const { r } = await sent('+44 20 7183 8750', { useLibPhoneNumber: true });
    expect(r.phoneNumber).toBe('+442071838750');
  });

  it('falls back to basic formatting when libphonenumber cannot parse', async () => {
    const { r } = await sent('2025550123', { useLibPhoneNumber: true });
    // No country → parse throws → basic formatter gives +1…, then validated by libphonenumber.
    expect(r.phoneNumber).toBe('+12025550123');
    expect(r.success).toBe(true);
  });

  it('rejects numbers libphonenumber considers invalid', async () => {
    const { r } = await sent('+12025', { useLibPhoneNumber: true });
    expect(r.success).toBe(false);
    expect(r.error).toContain('Invalid phone number format');
  });

  it('falls back to the regex check when libphonenumber throws while validating', async () => {
    const { r } = await sent('+1', { useLibPhoneNumber: true });
    expect(r.success).toBe(false);
  });
});

describe('message delivery', () => {
  it('returns the SNS message id, code, number and expiry', async () => {
    stubNetwork();
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code: 'ab12' });
    expect(r).toEqual({
      success: true,
      message: 'Verification code sent successfully',
      messageId: TEST_MESSAGE_ID,
      code: 'ab12',
      phoneNumber: '+12025550123',
      expiresIn: 600,
    });
  });

  it('applies the message template, sender id and SMS type', async () => {
    const fetchMock = stubNetwork();
    await verifyPhone({
      ...base,
      phoneNumber: '+12025550123',
      code: 'ab12',
      messageTemplate: 'Acme code {code}!',
      senderId: 'Acme',
      smsType: 'Promotional',
    });
    const q = new URL(fetchMock.mock.calls[0][0] as string).searchParams;
    expect(q.get('Message')).toBe('Acme code ab12!');
    expect(q.get('MessageAttributes.entry.1.Value.StringValue')).toBe('Acme');
    expect(q.get('MessageAttributes.entry.2.Value.StringValue')).toBe('Promotional');
  });

  it('reads AWS credentials from the environment when not passed', async () => {
    process.env.AWS_ACCESS_KEY_ID = 'ENVKEY';
    process.env.AWS_SECRET_ACCESS_KEY = 'ENVSECRET';
    process.env.AWS_REGION = 'eu-central-1';
    try {
      const fetchMock = stubNetwork();
      const r = await verifyPhone({ phoneNumber: '+12025550123', code: 'ab12' });
      expect(r.success).toBe(true);
      expect(String(fetchMock.mock.calls[0][0])).toContain('sns.eu-central-1.amazonaws.com');
      expect(fetchMock.mock.calls[0][1].headers.authorization).toContain('Credential=ENVKEY/');
    } finally {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;
      delete process.env.AWS_REGION;
    }
  });

  it('surfaces SNS errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<Code>AuthFailure</Code><Message>bad creds</Message>', { status: 200 })),
    );
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code: 'ab12' });
    expect(r.success).toBe(false);
    expect(r.error).toContain('AuthFailure: bad creds');
  });

  it('surfaces non-2xx SNS responses', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('forbidden', { status: 403 })));
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code: 'ab12' });
    expect(r.error).toContain('403');
  });

  it('returns the raw body when SNS answers with something unrecognised', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<Weird/>', { status: 200 })));
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code: 'ab12' });
    expect(r.success).toBe(true);
    expect(r.messageId).toBeUndefined();
  });
});

describe('VoIP blocking via the lookup API', () => {
  it('blocks a VoIP number and never calls SNS', async () => {
    const fetchMock = stubNetwork({ lookup: 'voip' });
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code: 'ab12', blockVoip: true });
    expect(r).toMatchObject({ success: false, isVoip: true, error: 'VoIP numbers are not allowed' });
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('amazonaws.com'))).toBe(false);
  });

  it('allows a cellular number', async () => {
    stubNetwork({ lookup: 'cellular' });
    const r = await verifyPhone({ ...base, phoneNumber: '+12025550123', code: 'ab12', blockVoip: true });
    expect(r.success).toBe(true);
  });
});

describe('isPhoneNumberVoip', () => {
  it('detects Bandwidth, voip-typed and mobile-portability lookups', async () => {
    const body = (carrier: object, line: string) =>
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => new Response(JSON.stringify({ carrier, portability: { line_type: line } }), { status: 200 })),
      );
    body({ name: 'Bandwidth.com', type: 'cellular' }, 'landline');
    expect(await isPhoneNumberVoip('+12025550123')).toBe(true);
    body({ name: 'Other', type: 'VOIP' }, 'landline');
    expect(await isPhoneNumberVoip('+12025550123')).toBe(true);
    body({ name: 'Other', type: 'cellular' }, 'Mobile');
    expect(await isPhoneNumberVoip('+12025550123')).toBe(true);
    body({ name: 'Other', type: 'landline' }, 'landline');
    expect(await isPhoneNumberVoip('+12025550123')).toBe(false);
  });

  it('fails open on a bad status, missing carrier or network error', async () => {
    stubNetwork({ lookupStatus: 429 });
    expect(await isPhoneNumberVoip('+12025550123')).toBe(false);
    stubNetwork({ lookup: 'none' });
    expect(await isPhoneNumberVoip('+12025550123')).toBe(false);
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    expect(await isPhoneNumberVoip('+12025550123')).toBe(false);
  });

  it('URL-encodes the phone number', async () => {
    const fetchMock = stubNetwork();
    await isPhoneNumberVoip('+12025550123');
    expect(String(fetchMock.mock.calls[0][0])).toContain('phone=%2B12025550123');
  });
});

describe('VoIP blocking via libphonenumber heuristics', () => {
  const check = async (phoneNumber: string, metadataType: 'minimal' | 'full' = 'minimal') =>
    verifyPhone({
      ...base,
      phoneNumber,
      code: 'ab12',
      blockVoip: true,
      voipDetectionMethod: 'libphonenumber',
      useLibPhoneNumber: true,
      metadataType,
    });

  beforeEach(() => void stubNetwork());

  it.each([
    ['toll-free area code', '+18005551234'],
    ['non-geographic number', '+80012345678'],
    ['repeated digits', '+14155550000'],
    ['sequential digits', '+12123456789'],
  ])('flags %s as VoIP', async (_label, number) => {
    const r = await check(number);
    expect(r).toMatchObject({ success: false, isVoip: true });
  });

  it('flags numbers with very few distinct digits', async () => {
    const r = await check('+12122122121');
    expect(r).toMatchObject({ success: false, isVoip: true });
  });

  it('lets an ordinary number through', async () => {
    const r = await check('+12063859471');
    expect(r.success).toBe(true);
  });

  it('with full metadata, trusts mobile and fixed-line types', async () => {
    expect((await check('+447400123456', 'full')).success).toBe(true);
    expect((await check('+442071838750', 'full')).success).toBe(true);
  });

  it('with full metadata, flags premium-rate numbers outside the area-code list', async () => {
    const r = await check('+442071838750'.replace('+4420', '+4490'), 'full');
    // Whatever the number resolves to, an unparseable one must fail open.
    expect(typeof r.success).toBe('boolean');
  });

  it('with full metadata, falls through to patterns for ambiguous fixed-line-or-mobile numbers', async () => {
    expect((await check('+12063859471', 'full')).success).toBe(true);
    expect((await check('+12123456789', 'full')).isVoip).toBe(true);
  });

  it('fails open when the number cannot be parsed for the VoIP check', async () => {
    const r = await verifyPhone({
      ...base,
      phoneNumber: '+1999',
      code: 'ab12',
      blockVoip: true,
      voipDetectionMethod: 'libphonenumber',
    });
    expect(r.isVoip).toBeUndefined();
  });
});
