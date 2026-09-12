/**
 * Cross-cutting behaviour: the two accepted authentication schemes, and the
 * phone-number formatting `verifyPhone` applies before handing off to SNS.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../src/verify-phone-server';
import { apiRequest, stubNetwork, TEST_API_KEY } from './helpers';

describe('SMS Verification API Integration Tests', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(globalThis.env);
    stubNetwork();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Authentication Methods', () => {
    it('should accept both X-API-Key and Bearer token headers', async () => {
      const body = { phoneNumber: '+12025550123' };

      const viaHeader = await app.request(
        apiRequest('/api/send', body, { 'X-API-Key': TEST_API_KEY }),
        undefined,
        globalThis.env,
      );
      expect(viaHeader.status).toBe(200);
      expect(((await viaHeader.json()) as any).success).toBe(true);

      const viaBearer = await app.request(
        apiRequest('/api/send', body, { Authorization: `Bearer ${TEST_API_KEY}` }),
        undefined,
        globalThis.env,
      );
      expect(viaBearer.status).toBe(200);
      expect(((await viaBearer.json()) as any).success).toBe(true);
    });

    it('should reject requests without authentication', async () => {
      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }, {}),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Invalid or missing API key');
    });

    it('should reject requests with invalid authentication', async () => {
      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }, { 'X-API-Key': 'not-the-key' }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should not reach the SMS provider when authentication fails', async () => {
      const fetchMock = stubNetwork();

      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }, {}),
        undefined,
        globalThis.env,
      );

      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('Phone Number Formatting', () => {
    it('should format various phone number formats correctly', async () => {
      const cases: [string, string][] = [
        ['2025550123', '+12025550123'],
        ['12025550123', '+12025550123'],
        ['+12025550123', '+12025550123'],
        ['(202) 555-0123', '+12025550123'],
        ['202-555-0123', '+12025550123'],
      ];

      for (const [input, expected] of cases) {
        const res = await app.request(
          apiRequest('/api/send', { phoneNumber: input }),
          undefined,
          globalThis.env,
        );
        const data: any = await res.json();

        expect(res.status, `${input} should be accepted`).toBe(200);
        expect(data.success).toBe(true);
        expect(data.phoneNumber, `${input} should normalise`).toBe(expected);
      }
    });

    it('should reject clearly invalid phone numbers', async () => {
      for (const input of ['not-a-number', '123', 'abc-def-ghij', '']) {
        const res = await app.request(
          apiRequest('/api/send', { phoneNumber: input }),
          undefined,
          globalThis.env,
        );
        const data: any = await res.json();

        expect(res.status, `${input} should be rejected`).toBe(400);
        expect(data.success).toBe(false);
        expect(data.error).toBeDefined();
      }
    });
  });

  describe('API Endpoints', () => {
    it('should handle the send verification endpoint', async () => {
      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'Verification code sent successfully',
        phoneNumber: '+12025550123',
      });
    });

    it('should handle the verify code endpoint', async () => {
      const res = await app.request(
        apiRequest('/api/verify', { phoneNumber: '+12025550123', code: '123456' }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({ success: true, verified: true });
    });
  });
});
