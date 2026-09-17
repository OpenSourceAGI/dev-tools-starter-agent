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
