import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPEN_AI_API_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

if (process.env.NODE_ENV === 'production' && !parsedEnv.data.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production.');
}

const vercelHost =
  parsedEnv.data.VERCEL_PROJECT_PRODUCTION_URL ?? parsedEnv.data.VERCEL_URL;
const vercelUrl = vercelHost
  ? `https://${vercelHost.replace(/^https?:\/\//, '')}`
  : undefined;
const appUrl = parsedEnv.data.NEXT_PUBLIC_APP_URL ?? vercelUrl ?? 'http://localhost:3000';

export const env = {
  ...parsedEnv.data,
  JWT_SECRET: parsedEnv.data.JWT_SECRET ?? 'development-only-fallback-secret-32-chars',
  NEXT_PUBLIC_APP_URL: appUrl,
};
