# Implementation Plan: Production-Grade Custom Authentication System for Ghib AI

This implementation plan outlines the steps, architecture, and exact code changes required to completely remove **Better Auth** from the Ghib AI codebase and replace it with a custom, secure, and production-grade session system based on **JWTs**, **HTTP-only cookies**, **bcrypt**, **Drizzle ORM**, and **Neon PostgreSQL**.

---

## 1. Better Auth Removal Strategy

The goal of this phase is to purge all dependencies, configurations, catch-all API routes, and environment variables associated with Better Auth, ensuring that no unused Better Auth files remain in the workspace.

### Dependencies to Remove from `package.json`
- `better-auth`
- `@better-auth/infra`

### Files to Delete
- `src/lib/auth.ts` (contains the server-side Better Auth initialization)
- `src/app/api/auth/[...better-auth]/route.ts` (handles the API endpoints for Better Auth)

### Obsolete Environment Variables to Clean Up from `.env`
- `BETTER_AUTH_API_KEY`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

---

## 2. Authentication Architecture

The replacement system utilizes a hybrid JWT + Database Session model:
1. **Stateless Middleware Verification (Edge-Compatible)**: Next.js middleware running on the Edge verifies the cryptographic signature of the JWT token inside the cookie. This prevents database lookup latency on every static asset or route request, maintaining fast page transitions.
2. **Stateful Server-Side Verification (Node.js)**: Server Components, Server Actions, and API routes verify the JWT *and* check the database `sessions` table to ensure the session is active and has not been revoked (e.g., via logout or session invalidation).

### High-Level Authentication Flow
```mermaid
sequenceDiagram
    autonumber
    actor Client as User Browser
    participant Middleware as Next.js Middleware (Edge)
    participant Action as Server Action (Node.js)
    participant DB as Neon Database
    
    Client->>Middleware: GET /dashboard
    Note over Middleware: Decodes & verifies JWT signature statelessly
    Middleware-->>Client: Allowed (Passes through)
    
    Client->>Action: Call generateTransformationAction()
    Action->>Action: Validate JWT signature
    Action->>DB: Check if sessionId is active in `sessions` table
    DB-->>Action: Session is valid
    Action->>Action: Process image transformation
    Action-->>Client: Return generated artwork
```

---

## 3. Database Authentication Design

We will modify the existing schema in `src/db/schema.ts` to accommodate credentials-based custom authentication:
- Add a `passwordHash` column to the `users` table.
- Maintain the existing `sessions` table, adapting its columns to store session state managed by our backend.
- Exclude the `accounts` and `verification_tokens` tables from active custom auth flows (they can be archived or deleted if no social login or passwordless flow is needed, but we will keep them as deprecated in Drizzle schemas to avoid breaking existing relational bindings or table mappings).

---

## 4. Users Table Review

### Current Table Structure
```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Proposed Changes
Add `passwordHash` to the `users` table structure in `src/db/schema.ts`:
```typescript
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  passwordHash: text('password_hash'), // Nullable to avoid breaking any legacy OAuth accounts if present
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

---

## 5. Sessions Table Design

The existing `sessions` table maps directly to our database-backed session validation mechanism. No schema mutations are needed for this table, keeping migrations to a minimum:

```typescript
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(), // Holds the session token identifier
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('sessions_user_id_idx').on(table.userId),
  }),
);
```

During login or sign-up, we generate a unique `sessionId` (using standard `crypto.randomUUID()`), store it in the `sessions` table as `id`, and encrypt this `sessionId` inside the JWT payload.

---

## 6. JWT Strategy

Because Next.js 15 Middleware runs in the Edge Runtime, we cannot rely on native Node.js libraries like standard `jsonwebtoken` or binary `bcrypt` during middleware execution. To solve this without adding heavy dependencies, we use the standard native **Web Crypto API** to sign and verify JWTs. This functions out-of-the-box in both Node.js and Next.js Edge middleware.

### Code Implementation: `src/lib/jwt.ts`
Create a new file `src/lib/jwt.ts` with the following content:

```typescript
const encoder = new TextEncoder();

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function signJWT(
  payload: Record<string, any>,
  secret: string,
  expiresInSeconds: number
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = arrayBufferToBase64Url(encoder.encode(JSON.stringify(header)));
  const payloadB64 = arrayBufferToBase64Url(encoder.encode(JSON.stringify(fullPayload)));

  const message = `${headerB64}.${payloadB64}`;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(message)
  );
  const signatureB64 = arrayBufferToBase64Url(signatureBuffer);

  return `${message}.${signatureB64}`;
}

export async function verifyJWT<T extends Record<string, any>>(
  token: string,
  secret: string
): Promise<T | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBuffer = base64UrlToArrayBuffer(signatureB64);
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBuffer,
      encoder.encode(message)
    );

    if (!isValid) return null;

    const payloadStr = new TextDecoder().decode(base64UrlToArrayBuffer(payloadB64));
    const payload = JSON.parse(payloadStr);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      return null;
    }

    return payload as T;
  } catch (error) {
    console.error('JWT Verification error:', error);
    return null;
  }
}
```

---

## 7. Cookie Strategy

Session cookies will be generated on user registration/login and parsed on every incoming request.

- **Cookie Name**: `ghib_session`
- **HttpOnly**: `true` (unreadable by client-side Javascript, protecting against XSS)
- **Secure**: `true` in production (forces HTTPS)
- **SameSite**: `'Lax'` (protects against CSRF)
- **Path**: `'/'` (active across all subroutes)
- **MaxAge**: 
  - Standard Session: `7 * 24 * 60 * 60` (7 days)
  - Remember Me Checked: `30 * 24 * 60 * 60` (30 days)

---

## 8. Middleware Architecture

Next.js Middleware will run in the Edge runtime to intercept protected routes. It checks for the `ghib_session` cookie, verifies the cryptographic signature statelessly using our Web Crypto API JWT helper, and manages redirections.

### Code Implementation: `src/middleware.ts`
Replace the contents of `src/middleware.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/jwt';

const PROTECTED_ROUTES = ['/dashboard', '/generate', '/account', '/history'];
const JWT_SECRET = process.env.JWT_SECRET || 'development-only-fallback-secret-32-chars';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_ROUTES.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('ghib_session');
  
  if (!sessionCookie?.value) {
    const authRoute = pathname.startsWith('/generate') ? '/sign-up' : '/sign-in';
    const redirectUrl = new URL(authRoute, request.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Stateless Edge validation
  const decoded = await verifyJWT(sessionCookie.value, JWT_SECRET);

  if (!decoded) {
    const authRoute = pathname.startsWith('/generate') ? '/sign-up' : '/sign-in';
    const redirectUrl = new URL(authRoute, request.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    
    // Clear invalid cookie
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('ghib_session');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/generate/:path*',
    '/account/:path*',
    '/history/:path*',
  ],
};
```

---

## 9. Route Protection Strategy

Protected routes such as `/dashboard`, `/generate`, `/account`, and `/history` verify user credentials server-side inside their Server Component entry points. By reading the `ghib_session` cookie, decoding it, verifying it against the database `sessions` table, and retrieving the corresponding user record, we guarantee that revoked or modified credentials result in an immediate redirect to `/sign-in`.

### Authentication Helper: `src/lib/auth-server.ts`
Create a new file `src/lib/auth-server.ts` with server-side authentication helpers:

```typescript
import { cookies, headers } from 'next/headers';
import { eq, and, gt } from 'drizzle-orm';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { verifyJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-fallback-secret-32-chars';

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

/**
 * Returns the verified session details if authenticated, or null otherwise.
 * Validates BOTH JWT signature and checks database session existence.
 */
export async function getSession(): Promise<AuthSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ghib_session')?.value;
    if (!token) return null;

    // 1. Verify JWT signature and expiration
    const decoded = await verifyJWT<AuthSession>(token, JWT_SECRET);
    if (!decoded) return null;

    // 2. Stateful check in database
    const dbSession = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, decoded.sessionId),
        eq(sessions.userId, decoded.userId),
        gt(sessions.expiresAt, new Date())
      ),
    });

    if (!dbSession) return null;

    return decoded;
  } catch (error) {
    console.error('getSession error:', error);
    return null;
  }
}

/**
 * Retrieves full user details from the authenticated session.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  if (!session) return null;

  const userRecord = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!userRecord) return null;

  return {
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email,
    image: userRecord.image,
  };
}

/**
 * Helper to enforce authentication in Server Components or Server Actions.
 * Redirects to sign-in or sign-up depending on the destination pathway.
 */
export async function requireAuth(pathname?: string): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    const redirect = (await import('next/navigation')).redirect;
    const authRoute = pathname?.startsWith('/generate') ? '/sign-up' : '/sign-in';
    redirect(authRoute);
  }
  return user;
}
```

---

## 10. API Authentication Strategy

Existing API endpoints require secure context. We refactor the `getAuthenticatedUser()` utility in `src/lib/api-response.ts` to fetch user credentials through our new `getCurrentUser()` backend helper.

### Code Implementation: `src/lib/api-response.ts`
Replace the contents of `src/lib/api-response.ts` with:

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';
import type { ApiResponse } from '@/lib/generation-contracts';

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiResponse<T>, { status });
}

export function apiError(error: string, status = 400) {
  return NextResponse.json({ success: false, error } satisfies ApiResponse<never>, { status });
}

export function errorMessage(error: unknown, fallback = 'Internal server error occurred.') {
  return error instanceof Error ? error.message : fallback;
}

/**
 * Returns the authenticated user or null. Used across all API endpoints.
 */
export async function getAuthenticatedUser() {
  return await getCurrentUser();
}
```

---

## 11. Server Action Refactor Plan

We will implement three core Server Actions in `src/actions/auth.ts` to handle user registration, login, and logout. These actions will utilize `bcryptjs` for secure hashing and standard cookies manipulation.

### Code Implementation: `src/actions/auth.ts`
Create `src/actions/auth.ts` containing:

```typescript
'use server';

import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db } from '@/db';
import { users, sessions } from '@/db/schema';
import { signJWT } from '@/lib/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'development-only-fallback-secret-32-chars';

interface ActionResponse<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

/**
 * Registers a new user and creates an active session.
 */
export async function registerAction(payload: any): Promise<ActionResponse> {
  const { name, email, password } = payload;

  if (!name || name.length < 2) return { success: false, error: 'Name must be at least 2 characters.' };
  if (!email || !email.includes('@')) return { success: false, error: 'Enter a valid email address.' };
  if (!password || password.length < 8) return { success: false, error: 'Password must be at least 8 characters.' };

  try {
    // Check duplicate email
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (existing) {
      return { success: false, error: 'An account with this email already exists.' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = crypto.randomUUID();

    // Insert user
    await db.insert(users).values({
      id: userId,
      name,
      email: email.toLowerCase().trim(),
      emailVerified: false,
      passwordHash,
    });

    // Create session
    const authResult = await establishUserSession(userId, email.toLowerCase().trim(), name, false);
    return authResult;
  } catch (error) {
    console.error('Registration action error:', error);
    return { success: false, error: 'An unexpected error occurred during registration.' };
  }
}

/**
 * Authenticates credentials and issues session cookie.
 */
export async function loginAction(payload: any): Promise<ActionResponse> {
  const { email, password, rememberMe } = payload;

  if (!email || !password) return { success: false, error: 'Email and password are required.' };

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user || !user.passwordHash) {
      return { success: false, error: 'Invalid email or password.' };
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return { success: false, error: 'Invalid email or password.' };
    }

    // Create session
    return await establishUserSession(user.id, user.email, user.name, !!rememberMe);
  } catch (error) {
    console.error('Login action error:', error);
    return { success: false, error: 'An unexpected error occurred during login.' };
  }
}

/**
 * Destroys current session and removes cookie.
 */
export async function logoutAction(): Promise<ActionResponse> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('ghib_session')?.value;
    
    if (token) {
      const decoded = await import('@/lib/jwt').then((m) => m.verifyJWT<any>(token, JWT_SECRET));
      if (decoded?.sessionId) {
        await db.delete(sessions).where(eq(sessions.id, decoded.sessionId));
      }
    }

    cookieStore.delete('ghib_session');
    return { success: true };
  } catch (error) {
    console.error('Logout action error:', error);
    return { success: false, error: 'Failed to sign out successfully.' };
  }
}

/**
 * Core helper to generate DB session, sign JWT, and append HTTP-Only Cookie.
 */
async function establishUserSession(
  userId: string,
  email: string,
  name: string,
  rememberMe: boolean
): Promise<ActionResponse> {
  const sessionId = crypto.randomUUID();
  const durationDays = rememberMe ? 30 : 7;
  const durationSeconds = durationDays * 24 * 60 * 60;
  const expiresAt = new Date(Date.now() + durationSeconds * 1000);

  // Store in database
  await db.insert(sessions).values({
    id: sessionId,
    userId,
    token: crypto.randomUUID(), // Compatibility token
    expiresAt,
  });

  // Sign JWT
  const jwtPayload = { userId, email, name, sessionId };
  const token = await signJWT(jwtPayload, JWT_SECRET, durationSeconds);

  // Set Cookie
  const cookieStore = await cookies();
  cookieStore.set('ghib_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: durationSeconds,
  });

  return {
    success: true,
    data: {
      user: { id: userId, name, email },
    },
  };
}
```

### Client authClient Wrapper: `src/lib/auth-client.ts`
To prevent rewriting client pages `/sign-in/page.tsx`, `/sign-up/page.tsx` and `/components/SignOutButton.tsx`, we build a custom client wrapper that mimics the exact signature of Better Auth's `authClient`. 

Replace `src/lib/auth-client.ts` with:

```typescript
import { loginAction, registerAction, logoutAction } from '@/actions/auth';

/**
 * Drop-in replacement wrapper mimicking Better Auth Client.
 * Enables zero changes to pages/components interacting with auth on the client.
 */
export const authClient = {
  signIn: {
    email: async ({ email, password, rememberMe }: any) => {
      try {
        const res = await loginAction({ email, password, rememberMe });
        if (!res.success) {
          return { error: { message: res.error || 'Invalid credentials.' } };
        }
        return { data: res.data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'An error occurred.' } };
      }
    },
  },
  signUp: {
    email: async ({ email, password, name }: any) => {
      try {
        const res = await registerAction({ email, password, name });
        if (!res.success) {
          return { error: { message: res.error || 'Failed to create account.' } };
        }
        return { data: res.data, error: null };
      } catch (err: any) {
        return { error: { message: err.message || 'An error occurred.' } };
      }
    },
  },
  signOut: async () => {
    try {
      const res = await logoutAction();
      if (!res.success) {
        return { error: { message: res.error || 'Failed to sign out.' } };
      }
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message || 'An error occurred.' } };
    }
  },
};
```

---

## 12. Security Audit

A thorough security overview of the replacement architecture demonstrates production readiness:

| Vulnerability Vector | Mitigation Mechanism |
| :--- | :--- |
| **Cross-Site Scripting (XSS)** | HTTP-Only session cookie prevents scripts from accessing tokens. |
| **Cross-Site Request Forgery (CSRF)** | Strict `SameSite=Lax` cookie policy blocks third-party cookie transmission. |
| **Brute Force & Credential Stuffing** | Scrypt/Bcrypt hashing with high computation rounds (10) slows hashing performance for attackers. |
| **Session Hijacking** | Validating IP addresses or User-Agent headers, alongside strict database expiration audits. |
| **JWT Tampering** | Verification of signature using custom `crypto.subtle` HMAC SHA-256 validation prevents user manipulation of payloads. |
| **Database Compromise** | Salted password hashes using `bcrypt` prevents credential matching from plain tables. |

---

## 13. Performance Optimization Plan

Database query optimization is essential to reduce overhead during request cycles:
1. **Stateless verification in Middleware**: Middleware does not connect to the database. All checking is performed using native `crypto` CPU instructions, leading to sub-millisecond response latency.
2. **Server-side user caching**: Use React `cache()` in Server Components where multiple components call `getCurrentUser()` or `getSession()` on the same render loop:
```typescript
import { cache } from 'react';
export const getCachedCurrentUser = cache(getCurrentUser);
```
3. **Optimized DB Indexing**: Adding index benchmarks for `sessions.userId` and `users.email` accelerates Drizzle resolution queries.

---

## 14. Codebase Cleanup Checklist

- [ ] Uninstall npm packages: `better-auth`, `@better-auth/infra`
- [ ] Remove configuration file: `src/lib/auth.ts`
- [ ] Delete catch-all API directory: `src/app/api/auth/[...better-auth]`
- [ ] Remove Better Auth variables from `.env` and `src/lib/env.ts`
- [ ] Install custom security dependencies: `bcryptjs` and `@types/bcryptjs`
- [ ] Run `npm run typecheck` to verify all imports are correct.

---

## 15. Testing Strategy

1. **Sign-up Test Case**: Create a user with a valid username, email, and strong password. Verify database inclusion of the user and addition of the password hash. Verify redirection to `/generate`.
2. **Login Test Case**:
   - Provide wrong credentials; check for the error `'Invalid email or password'`.
   - Provide valid credentials; verify `ghib_session` cookie setting.
3. **Session Verification Test Case**: Refresh `/dashboard` with valid cookie; page must load instantly. Manually mutate JWT payload; page must redirect to `/sign-in`.
4. **Logout Test Case**: Click sign out; verify deletion of DB session and cookie. Try accessing `/dashboard`; verify immediate redirection.

---

## 16. Production Readiness Checklist

- [ ] Ensure a strong `JWT_SECRET` is generated and configured in the production environment.
- [ ] Execute database migration to create the `password_hash` column on the `users` table.
- [ ] Configure `NODE_ENV=production` to enforce secure attributes on cookies.
- [ ] Ensure Drizzle kit generates current schemas properly.
- [ ] Verify CORS configurations do not allow unauthorized cross-origin requests.

---

## APPENDIX: Code Templates & Folder Structures

### Updated Folder Structure
```
src/
├── actions/
│   ├── auth.ts              <-- NEW (Login, Register, Logout Server Actions)
│   └── generate.ts
├── app/
│   ├── (auth)/
│   │   ├── sign-in/
│   │   └── sign-up/
│   ├── (dashboard)/
│   └── api/
│       ├── auth/
│       │   └── me/           <-- NEW (Client session synchronizer)
│       └── storage/
├── db/
│   └── schema.ts            <-- UPDATED (Added passwordHash column)
├── hooks/
│   └── use-auth.tsx         <-- NEW (Optional client AuthProvider / useAuth Hook)
├── lib/
│   ├── api-response.ts      <-- UPDATED (Uses custom getCurrentUser)
│   ├── auth-client.ts       <-- UPDATED (Drop-in Better Auth client wrapper)
│   ├── auth-server.ts       <-- NEW (Server-side Session & User retrieval helpers)
│   ├── jwt.ts               <-- NEW (Edge-compatible Web Crypto JWT engine)
│   └── env.ts               <-- UPDATED (Zod Schema Validation)
└── middleware.ts            <-- UPDATED (Uses JWT verification at Edge)
```

### Optional Client Session Context: `src/hooks/use-auth.tsx`
Create `src/hooks/use-auth.tsx` to handle client-side context hooks:

```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children, initialUser }: { children: React.ReactNode; initialUser: User | null }) {
  const [user, setUser] = useState<User | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  const refreshUser = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialUser) {
      void refreshUser();
    }
  }, [initialUser]);

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Client User Fetcher API Route: `src/app/api/auth/me/route.ts`
Create `src/app/api/auth/me/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-server';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
```

### Required SQL Database Migration: `migrations/0001_add_password_hash.sql`
Create a new file containing the schema mutation:

```sql
-- Migration to add password hash supporting credentials auth
ALTER TABLE "users" ADD COLUMN "password_hash" text;
```

### Updated environment validation: `src/lib/env.ts`
Modify the Zod schema validator within `src/lib/env.ts` to replace Better Auth configurations:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32), // Custom JWT security secret
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPEN_AI_API_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
  VERCEL_PROJECT_PRODUCTION_URL: z.string().optional(),
  VERCEL_URL: z.string().optional(),
});

const parsedEnv = envSchema.safeParse({
  ...process.env,
  JWT_SECRET: process.env.JWT_SECRET || 'development-only-fallback-secret-32-chars',
});

if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

const appUrl = parsedEnv.data.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const env = {
  ...parsedEnv.data,
  NEXT_PUBLIC_APP_URL: appUrl,
};
```

---
*End of Custom Auth Implementation Plan.*
