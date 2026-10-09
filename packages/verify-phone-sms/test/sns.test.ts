import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import snsDefault, { SNSClient, createClient, sendSMS } from '../src/sns';

const ok = (xml: string) => new Response(xml, { status: 200 });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SNSClient', () => {
  const client = () => new SNSClient({ accessKeyId: 'AKIA', secretAccessKey: 'secret', region: 'eu-west-1' });

  it('defaults the region and derives the endpoint from it', () => {
    expect(new SNSClient().region).toBe('us-east-1');
    expect(new SNSClient().endpoint).toBe('https://sns.us-east-1.amazonaws.com');
    expect(client().endpoint).toBe('https://sns.eu-west-1.amazonaws.com');
  });

  it('converts between strings, bytes and hex', () => {
    const c = client();
    expect(Array.from(c.stringToUint8Array('hi'))).toEqual([104, 105]);
    expect(c.arrayBufferToHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
    expect(c.arrayBufferToHex(new Uint8Array([1, 2]).buffer)).toBe('0102');
  });

  it('signs a request with SigV4 headers', async () => {
    const headers = await client().sign('GET', 'https://sns.eu-west-1.amazonaws.com/?Action=Publish', {}, '');
    expect(headers.host).toBe('sns.eu-west-1.amazonaws.com');
    expect(headers['x-amz-date']).toMatch(/^\d{8}T\d{6}Z$/);
    // SHA-256 of the empty payload.
    expect(headers['x-amz-content-sha256']).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(headers.authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIA\/\d{8}\/eu-west-1\/sns\/aws4_request, SignedHeaders=[a-z0-9;-]+, Signature=[0-9a-f]{64}$/,
    );
  });

  it('produces a different signature for a different secret', async () => {
    const a = await client().sign('GET', 'https://x/?a=1', { 'content-type': 't' }, '');
    const b = await new SNSClient({ accessKeyId: 'AKIA', secretAccessKey: 'other', region: 'eu-west-1' }).sign(
      'GET', 'https://x/?a=1', { 'content-type': 't' }, '',
    );
    expect(a.authorization).not.toBe(b.authorization);
  });

  describe('parseXMLResponse', () => {
    const c = client();
    it('extracts a message id, topic ARN or subscription ARN', () => {
      expect(c.parseXMLResponse('<MessageId>m-1</MessageId>')).toEqual({ MessageId: 'm-1' });
      expect(c.parseXMLResponse('<TopicArn>arn:t</TopicArn>')).toEqual({ TopicArn: 'arn:t' });
      expect(c.parseXMLResponse('<SubscriptionArn>arn:s</SubscriptionArn>')).toEqual({ SubscriptionArn: 'arn:s' });
    });

    it('returns the raw text when nothing is recognised', () => {
      expect(c.parseXMLResponse('<Other/>')).toEqual({ raw: '<Other/>' });
    });
  });

  describe('makeRequest', () => {
    it('issues a signed GET with the action and params in the query string', async () => {
      fetchMock.mockResolvedValue(ok('<MessageId>abc</MessageId>'));
      const res = await client().makeRequest('Publish', { Message: 'hello world' });

      expect(res).toEqual({ MessageId: 'abc' });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('https://sns.eu-west-1.amazonaws.com/?');
      expect(url).toContain('Action=Publish');
      expect(url).toContain('Version=2010-03-31');
      expect(url).toContain('Message=hello+world');
      expect(init.method).toBe('GET');
      expect(init.headers.authorization).toContain('AWS4-HMAC-SHA256');
    });

    it('wraps HTTP errors with the status and body', async () => {
      fetchMock.mockResolvedValue(new Response('denied', { status: 403 }));
      await expect(client().makeRequest('Publish')).rejects.toThrow('SNS Request failed: SNS API Error: 403 - denied');
    });

    it('wraps network failures, including non-Error rejections', async () => {
      fetchMock.mockRejectedValueOnce(new Error('offline'));
      await expect(client().makeRequest('Publish')).rejects.toThrow('SNS Request failed: offline');
      fetchMock.mockRejectedValueOnce('string failure');
      await expect(client().makeRequest('Publish')).rejects.toThrow('SNS Request failed: string failure');
    });
  });
});

describe('sendSMS', () => {
  it('reports an error when no client has been created or passed', async () => {
    // A fresh module instance has no default client.
    vi.resetModules();
    const fresh = await import('../src/sns');
    const cb = vi.fn();
    fresh.sendSMS('hi', '+15551234567', 'Sender', 'Transactional', cb);
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0].err.message).toContain('SNS client not initialized');
  });

  it('publishes through the default client and passes back the message id', async () => {
    fetchMock.mockResolvedValue(ok('<MessageId>msg-9</MessageId>'));
    createClient({ accessKeyId: 'AKIA', secretAccessKey: 's' });

    const result = await new Promise<{ err: any; id?: string }>((resolve) => {
      sendSMS('code 123', '+15551234567', 'MyApp', 'Transactional', (err, id) => resolve({ err, id }));
    });

    expect(result).toEqual({ err: undefined, id: 'msg-9' });
    const q = new URL(fetchMock.mock.calls[0][0] as string).searchParams;
    expect(q.get('PhoneNumber')).toBe('+15551234567');
    expect(q.get('Message')).toBe('code 123');
    expect(q.get('MessageAttributes.entry.1.Name')).toBe('AWS.SNS.SMS.SenderID');
    expect(q.get('MessageAttributes.entry.1.Value.StringValue')).toBe('MyApp');
    expect(q.get('MessageAttributes.entry.2.Value.StringValue')).toBe('Transactional');
  });

  it('prefers an explicitly supplied client', async () => {
    fetchMock.mockResolvedValue(ok('<MessageId>explicit</MessageId>'));
    const explicit = new SNSClient({ accessKeyId: 'A', secretAccessKey: 'B', region: 'ap-south-1' });
    const id = await new Promise<string | undefined>((resolve) => {
      sendSMS('m', '+1', 'S', 'Promotional', (_e, mid) => resolve(mid), explicit);
    });
    expect(id).toBe('explicit');
    expect(fetchMock.mock.calls[0][0]).toContain('sns.ap-south-1.amazonaws.com');
  });

  it('hands failures to the callback with the stack', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    createClient({ accessKeyId: 'A', secretAccessKey: 'B' });
    const err = await new Promise<any>((resolve) => {
      sendSMS('m', '+1', 'S', 'Transactional', (e) => resolve(e));
    });
    expect(err.err.message).toContain('SNS API Error: 500');
    expect(typeof err['err.stack']).toBe('string');
  });
});

describe('default export', () => {
  it('bundles createClient and sendSMS', () => {
    expect(snsDefault.createClient).toBe(createClient);
    expect(snsDefault.sendSMS).toBe(sendSMS);
  });
});
