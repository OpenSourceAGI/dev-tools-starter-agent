import path from 'node:path'
import { createOpenAPI } from 'fumadocs-openapi/server'

/**
 * OpenAPI specs rendered under /docs/api-reference.
 * Keys are the schema IDs that `<APIPage document="…" />` refers to.
 */
export const openapi = createOpenAPI({
  input: {
    'verify-phone-sms': path.resolve(
      '../../packages/verify-phone-sms/openapi.json'
    ),
  },
  proxyUrl: '/api/proxy',
})
