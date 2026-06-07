import { and, eq, gt } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from '@/db';
import { sessions, users } from '@/db/schema';
import { getJwtSecret, SESSION_COOKIE_NAME } from '@/lib/auth-config';
import { verifyJWT } from '@/lib/jwt';

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

function isAuthSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<AuthSession>;
  return (
    typeof session.userId === 'string' &&
    typeof session.email === 'string' &&
    typeof session.name === 'string' &&
    typeof session.sessionId === 'string'
  );
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const decoded = await verifyJWT<Record<string, unknown>>(token, getJwtSecret());

    if (!isAuthSession(decoded)) {
      return null;
    }

    const dbSession = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, decoded.sessionId),
        eq(sessions.userId, decoded.userId),
        gt(sessions.expiresAt, new Date()),
      ),
    });

    if (!dbSession) {
      return null;
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      sessionId: decoded.sessionId,
    };
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

export const getCachedSession = cache(getSession);

export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();

  if (!session) {
    return null;
  }

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!userRecord) {
    return null;
  }

  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    image: userRecord.image,
  };
}

export const getCachedCurrentUser = cache(getCurrentUser);

export async function requireAuth(pathname?: string): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    const authRoute = pathname?.startsWith('/generate') ? '/sign-up' : '/sign-in';
    redirect(authRoute);
  }

  return user;
}
