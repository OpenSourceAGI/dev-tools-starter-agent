export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Core API",
    version: "1.0.0",
    description: "Core user management API",
    contact: {
      name: "API Support"
    }
  },
  servers: [
    {
      url: "http://localhost:3000/api",
      description: "Development server"
    }
  ],
  tags: [
    {
      name: "User",
      description: "User management endpoints"
    }
  ],
  paths: {
    "/user/settings": {
      get: {
        tags: ["User"],
        summary: "Get user settings",
        description: "Retrieve user settings and preferences",
        responses: {
          "200": {
            description: "Successful response",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Settings" }
              }
            }
          },
          "401": {
            description: "Unauthorized"
          }
        }
      },
      post: {
        tags: ["User"],
        summary: "Save user settings",
        description: "Save or update user settings and preferences",
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/Settings" }
            }
          }
        },
        responses: {
          "200": {
            description: "Settings saved successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" }
                  }
                }
              }
            }
          },
          "401": {
            description: "Unauthorized"
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Settings: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["light", "dark", "system"] },
          notifications: { type: "boolean" },
          language: { type: "string" },
          timezone: { type: "string" }
        }
      }
    },
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer"
      }
    }
  }
}
