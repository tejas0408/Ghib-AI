'use server';

import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { cookies, headers } from 'next/headers';
import { z } from 'zod';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import {
  DEFAULT_SESSION_MAX_AGE_SECONDS,
  getJwtSecret,
  REMEMBERED_SESSION_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
} from '@/lib/auth-config';
import { signJWT, verifyJWT } from '@/lib/jwt';

type ActionResponse<T = unknown> =
  | {
      success: true;
      data: T;
    }
  | {
      success: false;
      error: string;
    };

interface AuthActionUser {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.'),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().optional(),
});

export async function registerAction(payload: unknown): Promise<ActionResponse<AuthActionUser>> {
  const parsed = registerSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid registration details.',
    };
  }

  const { name, email, password } = parsed.data;

  try {
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    await db.insert(users).values({
      id: userId,
      name,
      email,
      emailVerified: false,
      passwordHash,
    });

    return establishUserSession(userId, email, name, false);
  } catch (error) {
    console.error('Registration action error:', error);
    return { success: false, error: 'An unexpected error occurred during registration.' };
  }
}

export async function loginAction(payload: unknown): Promise<ActionResponse<AuthActionUser>> {
  const parsed = loginSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Email and password are required.',
    };
  }

  const { email, password, rememberMe } = parsed.data;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user?.passwordHash) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const matches = await bcrypt.compare(password, user.passwordHash);

    if (!matches) {
      return { success: false, error: 'Invalid email or password.' };
    }

    return establishUserSession(user.id, user.email, user.name, Boolean(rememberMe));
  } catch (error) {
    console.error('Login action error:', error);
    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}

export async function logoutAction(): Promise<ActionResponse<null>> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (token) {
      const decoded = await verifyJWT<{ sessionId?: unknown }>(token, getJwtSecret());

      if (typeof decoded?.sessionId === 'string') {
        await db.delete(sessions).where(eq(sessions.id, decoded.sessionId));
      }
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return { success: true, data: null };
  } catch (error) {
    console.error('Logout action error:', error);
    return { success: false, error: 'Failed to sign out successfully.' };
  }
}

async function establishUserSession(
  userId: string,
  email: string,
  name: string,
  rememberMe: boolean,
): Promise<ActionResponse<AuthActionUser>> {
  const sessionId = crypto.randomUUID();
  const maxAge = rememberMe ? REMEMBERED_SESSION_MAX_AGE_SECONDS : DEFAULT_SESSION_MAX_AGE_SECONDS;
  const expiresAt = new Date(Date.now() + maxAge * 1000);
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for')?.split(',')[0]?.trim();
  const userAgent = headerStore.get('user-agent');

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    token: crypto.randomUUID(),
    expiresAt,
    ipAddress: forwardedFor || null,
    userAgent,
  });

  const token = await signJWT({ userId, email, name, sessionId }, getJwtSecret(), maxAge);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  });

  return {
    success: true,
    data: {
      user: {
        id: userId,
        name,
        email,
      },
    },
  };
}
