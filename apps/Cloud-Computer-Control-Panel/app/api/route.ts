/**
 * @fileoverview The API reference, served at the API root.
 *
 * `GET /api` renders the Scalar viewer against the spec at `/openapi.json`.
 * It lives here rather than at `/api-reference` because `/api` is the URL
 * people try first; the old address redirects here so already-installed
 * copies of the VS Code extension keep working.
 */
import { ApiReference } from "@scalar/nextjs-api-reference"

export const GET = ApiReference({
  spec: {
    url: "/openapi.json",
  },
  theme: "purple",
  darkMode: true,
  layout: "modern",
  defaultHttpClient: {
    targetKey: "javascript",
    clientKey: "fetch",
  },
  authentication: {
    preferredSecurityScheme: "awsCredentials",
  },
})
