import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  BETTER_AUTH_SECRET: z.string().min(16).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  ENABLE_GOOGLE_AUTH: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPEN_AI_API_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

if (process.env.NODE_ENV === 'production' && !parsedEnv.data.BETTER_AUTH_SECRET) {
  throw new Error('BETTER_AUTH_SECRET is required in production.');
}

export const env = {
  ...parsedEnv.data,
  BETTER_AUTH_URL: parsedEnv.data.BETTER_AUTH_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_APP_URL: parsedEnv.data.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  BETTER_AUTH_SECRET:
    parsedEnv.data.BETTER_AUTH_SECRET ?? 'development-only-better-auth-secret-32-chars',
};
