import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().optional(),
        DATABASE_AUTH_TOKEN: z.string().optional(),
        GOOGLE_CLIENT_ID: z.string().optional(),
        GOOGLE_CLIENT_SECRET: z.string().optional(),
        BETTER_AUTH_SECRET: z.string().optional(),
        RESEND_API_KEY: z.string().optional(),
        // Seals stored cloud credentials at rest. Falls back to BETTER_AUTH_SECRET.
        CREDENTIALS_ENCRYPTION_KEY: z.string().optional(),
        // Optional server-wide AWS credentials, used when a user has none saved.
        AWS_ACCESS_KEY_ID: z.string().optional(),
        AWS_SECRET_ACCESS_KEY: z.string().optional(),
        AWS_REGION: z.string().optional(),
        NODE_ENV: z
            .enum(['development', 'test', 'production'])
            .default('development'),
    },
    client: {
        NEXT_PUBLIC_APP_URL: z.string().optional(),
        NEXT_PUBLIC_APP_NAME: z.string().optional(),
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
    },
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN,
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
        BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        CREDENTIALS_ENCRYPTION_KEY: process.env.CREDENTIALS_ENCRYPTION_KEY,
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
        AWS_REGION: process.env.AWS_REGION,
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
        NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
})
