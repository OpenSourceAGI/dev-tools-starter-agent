/**
 * Endpoint-level tests for the routes `src/verify-phone-server.ts` serves:
 * `/`, `/health`, `POST /api/send`, `POST /api/verify`, `POST /api/sms`, and
 * the documentation pair `/docs` (Swagger UI) and `/openapi.json` (the spec).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { vi } from 'vitest';
import { createApp } from '../src/verify-phone-server';
import { apiRequest, stubNetwork, TEST_API_KEY, TEST_MESSAGE_ID } from './helpers';

declare global {
  // eslint-disable-next-line no-var
  var env: Record<string, string>;
}

describe('SMS Verification API', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(globalThis.env);
    stubNetwork();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Service endpoints', () => {
    it('should describe the API on the root endpoint', async () => {
      const res = await app.request('http://localhost/', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'SMS Verification API',
      });
      expect(data.endpoints).toMatchObject({
        health: '/health',
        send: '/api/send',
        verify: '/api/verify',
        docs: '/docs',
        openapi: '/openapi.json',
      });
    });

    it('should return health status', async () => {
      const res = await app.request('http://localhost/health', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        status: 'healthy',
      });
      expect(data.timestamp).toBeDefined();
    });

    it('should not require an API key for the public endpoints', async () => {
      for (const path of ['/', '/health', '/docs', '/openapi.json']) {
        const res = await app.request(`http://localhost${path}`, {}, globalThis.env);
        expect(res.status, `${path} should be public`).toBe(200);
      }
    });
  });

  describe('Send Verification Code', () => {
    it('should require API key authentication', async () => {
      const req = apiRequest('/api/send', { phoneNumber: '+12025550123' }, {});
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or missing API key',
      });
    });

    it('should reject invalid API key', async () => {
      const req = apiRequest('/api/send', { phoneNumber: '+12025550123' }, {
        'X-API-Key': 'wrong-key',
      });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({ success: false, error: 'Unauthorized' });
    });

    it('should accept Bearer token authentication', async () => {
      const req = apiRequest('/api/send', { phoneNumber: '+12025550123' }, {
        Authorization: `Bearer ${TEST_API_KEY}`,
      });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.messageId).toBe(TEST_MESSAGE_ID);
    });

    it('should reject invalid phone number format', async () => {
      const req = apiRequest('/api/send', { phoneNumber: 'invalid-phone' });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid phone number format');
    });

    it('should format a 10-digit phone number to E.164', async () => {
      const req = apiRequest('/api/send', { phoneNumber: '2025550123' });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.phoneNumber).toBe('+12025550123');
    });

    it('should return the generated code and its expiry', async () => {
      const req = apiRequest('/api/send', { phoneNumber: '+12025550123' });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.code).toMatch(/^\d{6}$/);
      expect(data.expiresIn).toBe(600);
    });

    it('should send the caller-supplied code', async () => {
      const req = apiRequest('/api/send', { phoneNumber: '+12025550123', code: '424242' });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.code).toBe('424242');
    });
  });

  describe('Verify Code', () => {
    it('should require API key authentication', async () => {
      const req = apiRequest('/api/verify', { phoneNumber: '+12025550123', code: '123456' }, {});
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(401);
      expect(data).toMatchObject({ success: false, error: 'Unauthorized' });
    });

    it('should reject invalid API key', async () => {
      const req = apiRequest('/api/verify', { phoneNumber: '+12025550123', code: '123456' }, {
        'X-API-Key': 'wrong-key',
      });
      const res = await app.request(req, undefined, globalThis.env);

      expect(res.status).toBe(401);
    });

    it('should accept Bearer token authentication', async () => {
      const req = apiRequest('/api/verify', { phoneNumber: '+12025550123', code: '123456' }, {
        Authorization: `Bearer ${TEST_API_KEY}`,
      });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({ success: true, verified: true });
    });
  });

  describe('General SMS', () => {
    it('should require API key authentication', async () => {
      const req = apiRequest('/api/sms', { phoneNumber: '+12025550123', message: 'hello' }, {});
      const res = await app.request(req, undefined, globalThis.env);

      expect(res.status).toBe(401);
    });

    it('should send a custom message', async () => {
      const req = apiRequest('/api/sms', { phoneNumber: '+12025550123', message: 'hello' });
      const res = await app.request(req, undefined, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({
        success: true,
        message: 'SMS sent successfully',
        messageId: TEST_MESSAGE_ID,
      });
    });
  });

  describe('Documentation Endpoints', () => {
    it('should serve the OpenAPI spec as JSON', async () => {
      const res = await app.request('http://localhost/openapi.json', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data).toMatchObject({ openapi: '3.0.0' });
      expect(data.info.title).toBe('SMS Verification API');
      expect(data.paths['/api/send']).toBeDefined();
    });

    it('should serve Swagger UI as HTML', async () => {
      const res = await app.request('http://localhost/docs', {}, globalThis.env);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
      expect(await res.text()).toContain('/openapi.json');
    });
  });

  describe('Error Handling', () => {
    it('should return a JSON 404 for unknown endpoints', async () => {
      const res = await app.request('http://localhost/nonexistent', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(404);
      expect(data).toMatchObject({ success: false, error: 'Not found' });
    });
  });
});
