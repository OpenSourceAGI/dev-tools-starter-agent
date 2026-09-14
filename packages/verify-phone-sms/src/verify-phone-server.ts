/**
 * SMS API Server using Hono and AWS SNS.
 *
 * - Provides endpoints for sending and verifying SMS codes.
 * - Supports general SMS messaging with custom text.
 * - Supports API key authentication.
 * - Optionally blocks VoIP numbers using a phone lookup API.
 * - Designed for Cloudflare Workers, but testable locally.
 *
 * @module verify-phone-server
 */

import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { rateLimiter } from "hono-rate-limiter";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import verifyPhone from "./verify-phone";

interface Env {
  Bindings: {
    API_KEY?: string;
    AWS_ACCESS_KEY_ID?: string;
    AWS_SECRET_ACCESS_KEY?: string;
    AWS_REGION?: string;
    SMS_SENDER_ID?: string;
  };
}

// Create the main app
const app = new OpenAPIHono<Env>();

// Middleware
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: ["*"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    maxAge: 86400,
  }),
);

// Rate limiting - lazy loaded to avoid global scope issues
const createRateLimiter = () =>
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    keyGenerator: (c) =>
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "unknown",
  } as any);

// Apply rate limiting only when the middleware is actually used
app.use("*", async (c, next) => {
  const limiter = createRateLimiter();
  return limiter(c as any, next);
});

// API Key authentication middleware
const authenticateApiKey = async (c: any, next: () => Promise<void>) => {
  const apiKey =
    c.req.header("X-API-Key") ||
    c.req.header("Authorization")?.replace("Bearer ", "");
  const expectedApiKey = c.env?.API_KEY;

  if (!apiKey || apiKey !== expectedApiKey) {
    return c.json(
      {
        success: false,
        error: "Unauthorized",
        message: "Invalid or missing API key",
      },
      401,
    );
  }

  await next();
};

// Health check endpoint
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "SMS Verification API",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      send: "/api/send",
      verify: "/api/verify",
      docs: "/docs",
      openapi: "/openapi.json",
    },
  });
});

// Health check
app.get("/health", (c) => {
  return c.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: "N/A", // process.uptime() not available in Cloudflare Workers
  });
});

// Apply authentication to all API routes. This must be registered before the
// `/api/*` handlers below: Hono runs middleware only for routes defined after
// it, so registering this at the bottom of the file left every endpoint open.
app.use("/api/*", authenticateApiKey);

// Generate verification code
function generateCode(length = 6) {
  const chars = "0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Send SMS verification code
const sendRoute = createRoute({
  method: "post",
  path: "/api/send",
  security: [{ apiKey: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            phoneNumber: z.string().min(1, "Phone number is required"),
            code: z.string().optional(),
            blockVoip: z.boolean().optional().default(false),
            senderId: z.string().optional().default("Verify"),
            messageTemplate: z.string().optional(),
            smsType: z
              .enum(["Transactional", "Promotional"])
              .optional()
              .default("Transactional"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string().optional(),
            messageId: z.string().optional(),
            code: z.string().optional(),
            phoneNumber: z.string().optional(),
            expiresIn: z.number().optional(),
            error: z.string().optional(),
            details: z.string().optional(),
            isVoip: z.boolean().optional(),
          }),
        },
      },
      description: "SMS sent successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
            details: z.string().optional(),
          }),
        },
      },
      description: "Bad request",
    },
    401: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
            message: z.string(),
          }),
        },
      },
      description: "Unauthorized",
    },
  },
});

app.openapi(sendRoute, (async (c: any) => {
  try {
    const body = await c.req.json();
    const { phoneNumber, code, blockVoip, senderId, messageTemplate, smsType } =
      body;

    // Generate code if not provided
    const verificationCode = code || generateCode();

    // Get AWS credentials from environment
    const awsCredentials = {
      accessKeyId: c.env?.AWS_ACCESS_KEY_ID,
      secretAccessKey: c.env?.AWS_SECRET_ACCESS_KEY,
      awsRegion: c.env?.AWS_REGION || "us-east-1",
    };

    // Validate AWS credentials
    if (!awsCredentials.accessKeyId || !awsCredentials.secretAccessKey) {
      return c.json(
        {
          success: false,
          error: "AWS credentials not configured",
          details:
            "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables",
        },
        500,
      );
    }

    // Send verification SMS
    const result = await verifyPhone({
      phoneNumber,
      code: verificationCode,
      ...awsCredentials,
      blockVoip,
      senderId: senderId || c.env?.SMS_SENDER_ID || "Verify",
      messageTemplate,
      smsType,
    });

    if (result.success) {
      return c.json({
        success: true,
        message: result.message,
        messageId: result.messageId,
        code: result.code,
        phoneNumber: result.phoneNumber,
        expiresIn: result.expiresIn,
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.error,
          details: result.details,
          isVoip: result.isVoip,
        },
        400,
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}) as any);

// Verify SMS code (mock endpoint for demonstration)
const verifyRoute = createRoute({
  method: "post",
  path: "/api/verify",
  security: [{ apiKey: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            phoneNumber: z.string().min(1, "Phone number is required"),
            code: z.string().min(1, "Verification code is required"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string().optional(),
            verified: z.boolean().optional(),
            error: z.string().optional(),
          }),
        },
      },
      description: "Code verified successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            error: z.string(),
          }),
        },
      },
      description: "Bad request",
    },
  },
});

app.openapi(verifyRoute, (async (c: any) => {
  try {
    const body = await c.req.json();
    const { phoneNumber, code } = body;

    // This is a mock verification - in a real app, you'd store codes in a database
    // and verify them against stored values with proper expiration handling

    // For demo purposes, we'll just return success
    // In production, implement proper code storage and verification
    return c.json({
      success: true,
      message: "Code verified successfully",
      verified: true,
    });
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}) as any);

// General SMS sending endpoint
const generalSmsRoute = createRoute({
  method: "post",
  path: "/api/sms",
  security: [{ apiKey: [] }],
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            phoneNumber: z.string().min(1, "Phone number is required"),
            message: z.string().min(1, "Message is required"),
            senderId: z.string().optional().default("Verify"),
            smsType: z
              .enum(["Transactional", "Promotional"])
              .optional()
              .default("Transactional"),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string().optional(),
            messageId: z.string().optional(),
            phoneNumber: z.string().optional(),
            error: z.string().optional(),
            details: z.string().optional(),
          }),
        },
      },
      description: "SMS sent successfully",
    },
  },
});

app.openapi(generalSmsRoute, (async (c: any) => {
  try {
    const body = await c.req.json();
    const { phoneNumber, message, senderId, smsType } = body;

    // Get AWS credentials from environment
    const awsCredentials = {
      accessKeyId: c.env?.AWS_ACCESS_KEY_ID,
      secretAccessKey: c.env?.AWS_SECRET_ACCESS_KEY,
      awsRegion: c.env?.AWS_REGION || "us-east-1",
    };

    // Validate AWS credentials
    if (!awsCredentials.accessKeyId || !awsCredentials.secretAccessKey) {
      return c.json(
        {
          success: false,
          error: "AWS credentials not configured",
          details:
            "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables",
        },
        500,
      );
    }

    // Send general SMS
    const result = await verifyPhone({
      phoneNumber,
      code: "GENERAL", // Use a placeholder code for general SMS
      ...awsCredentials,
      blockVoip: false,
      senderId: senderId || c.env?.SMS_SENDER_ID || "Verify",
      messageTemplate: message,
      smsType,
    });

    if (result.success) {
      return c.json({
        success: true,
        message: "SMS sent successfully",
        messageId: result.messageId,
        phoneNumber: result.phoneNumber,
      });
    } else {
      return c.json(
        {
          success: false,
          error: result.error,
          details: result.details,
        },
        400,
      );
    }
  } catch (error) {
    return c.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}) as any);

// OpenAPI documentation
app.openAPIRegistry.registerComponent("securitySchemes", "apiKey", {
  type: "apiKey",
  name: "X-API-Key",
  in: "header",
});

app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    title: "SMS Verification API",
    version: "1.0.0",
    description: "API for sending SMS verification codes using AWS SNS",
  },
  servers: [
    {
      url: "https://sms-verification-api.your-subdomain.workers.dev",
      description: "Production server",
    },
    {
      url: "http://localhost:8787",
      description: "Development server",
    },
  ],
});

// Swagger UI
app.get("/docs", swaggerUI({ url: "/openapi.json" }));

// Error handling
app.onError((err, c) => {
  console.error("Server error:", err);
  return c.json(
    {
      success: false,
      error: "Internal server error",
      details: err.message,
    },
    500,
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: "Not found",
      message: "The requested endpoint does not exist",
    },
    404,
  );
});

export { isPhoneNumberVoip } from "./verify-phone";

export const createApp = (_env?: Env["Bindings"]) => app;

export default app;
