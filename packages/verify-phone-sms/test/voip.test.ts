/**
 * VoIP blocking: the `blockVoip` flag on `POST /api/send`, and the
 * `isPhoneNumberVoip` lookup behind it.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createApp, isPhoneNumberVoip } from '../src/verify-phone-server';
import { apiRequest, stubNetwork } from './helpers';

describe('VoIP Blocking Functionality', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(globalThis.env);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('blockVoip parameter', () => {
    it('should skip the lookup entirely when blockVoip is not specified', async () => {
      const fetchMock = stubNetwork({ lookup: 'voip' });

      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      const lookups = fetchMock.mock.calls.filter(([url]) => String(url).includes('phone-lookup'));
      expect(lookups).toHaveLength(0);
    });

    it('should allow requests when blockVoip is false', async () => {
      stubNetwork({ lookup: 'voip' });

      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123', blockVoip: false }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should send when blockVoip is true and the number is not VoIP', async () => {
      stubNetwork({ lookup: 'landline' });

      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123', blockVoip: true }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should reject when blockVoip is true and the number is VoIP', async () => {
      stubNetwork({ lookup: 'voip' });

      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123', blockVoip: true }),
        undefined,
        globalThis.env,
      );
      const data: any = await res.json();

      expect(res.status).toBe(400);
      expect(data).toMatchObject({
        success: false,
        error: 'VoIP numbers are not allowed',
        isVoip: true,
      });
    });
  });

  describe('VoIP detection logic', () => {
    it('should report a Bandwidth/VoIP carrier as VoIP', async () => {
      stubNetwork({ lookup: 'voip' });
      await expect(isPhoneNumberVoip('+12025550123')).resolves.toBe(true);
    });

    it('should report a landline carrier as not VoIP', async () => {
      stubNetwork({ lookup: 'landline' });
      await expect(isPhoneNumberVoip('+12025550123')).resolves.toBe(false);
    });

    it('should treat an empty lookup response as not VoIP', async () => {
      stubNetwork({ lookup: 'none' });
      await expect(isPhoneNumberVoip('+12025550123')).resolves.toBe(false);
    });

    it('should default to allowing the number when the lookup fails', async () => {
      stubNetwork({ lookupStatus: 429 });
      await expect(isPhoneNumberVoip('+12025550123')).resolves.toBe(false);
    });
  });
});
