/**
 * Server-level tests exercising the default export the Worker entry point
 * (`src/index.ts`) mounts, rather than the `createApp` factory.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import app from '../src/verify-phone-server';
import { apiRequest, stubNetwork, TEST_API_KEY } from './helpers';

describe('SMS Verification API Server', () => {
  beforeEach(() => {
    stubNetwork();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Health Check Endpoints', () => {
    it('should return API info on root endpoint', async () => {
      const res = await app.request('http://localhost/', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('SMS Verification API');
      expect(data.endpoints).toBeDefined();
    });

    it('should return health status', async () => {
      const res = await app.request('http://localhost/health', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.status).toBe('healthy');
      expect(data.timestamp).toBeDefined();
    });
  });

  describe('API Authentication', () => {
    it('should require API key for protected endpoints', async () => {
      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }, {}),
        undefined,
        globalThis.env,
      );

      expect(res.status).toBe(401);
    });

    it('should reject a key that does not match the configured one', async () => {
      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }, {
          'X-API-Key': 'sms_1234567890abcdef1234567890abcdef',
        }),
        undefined,
        globalThis.env,
      );

      expect(res.status).toBe(401);
    });

    it('should accept valid API key', async () => {
      const res = await app.request(
        apiRequest('/api/send', { phoneNumber: '+12025550123' }, { 'X-API-Key': TEST_API_KEY }),
        undefined,
        globalThis.env,
      );

      expect(res.status).toBe(200);
    });

    it('should reject every /api/* route without a key', async () => {
      const routes: [string, unknown][] = [
        ['/api/send', { phoneNumber: '+12025550123' }],
        ['/api/verify', { phoneNumber: '+12025550123', code: '123456' }],
        ['/api/sms', { phoneNumber: '+12025550123', message: 'hello' }],
      ];

      for (const [path, body] of routes) {
        const res = await app.request(apiRequest(path, body, {}), undefined, globalThis.env);
        expect(res.status, `${path} should be protected`).toBe(401);
      }
    });
  });

  describe('Documentation', () => {
    it('should serve Swagger UI at /docs', async () => {
      const res = await app.request('http://localhost/docs', {}, globalThis.env);

      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/html');
    });

    it('should serve the OpenAPI spec at /openapi.json', async () => {
      const res = await app.request('http://localhost/openapi.json', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(200);
      expect(data.openapi).toBe('3.0.0');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      const res = await app.request('http://localhost/nonexistent', {}, globalThis.env);
      const data: any = await res.json();

      expect(res.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Not found');
    });
  });
});
