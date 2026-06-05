# Ghib AI Phase 2: Technical Implementation Blueprint & Production Codebase

This document serves as the complete technical blueprint and copy-pasteable production codebase structure for Phase 2 of Ghib AI. It details the setup of authentication, database schemas, Polar.sh billing sync, render quotas, protected routes, and frame-based canvas scroll animations.

---

## 1. System Architecture Matrix

```mermaid
graph TD
    User([Client Web Browser]) -->|HTTPS Request| NextMiddleware[Next.js Edge Middleware]
    
    subgraph App_Server [Next.js App Server]
        NextMiddleware -->|Auth Required| RouteGuard{Protected Route?}
        RouteGuard -->|No / Public| PublicRoutes[Home Page / Sign-In / Sign-Up]
        RouteGuard -->|Yes / Private| ProtectedRoutes[Dashboard / Generate / Billing / History / Account]
        
        PublicRoutes --> AuthClient[Better Auth Client SDK]
        ProtectedRoutes --> ServerActions[Server Actions / API Handlers]
        
        ServerActions --> AuthServer[Better Auth Server Instance]
        ServerActions --> DrizzleClient[Drizzle ORM Engine]
        ServerActions --> PolarSDK[Polar.sh Billing SDK]
    end

    subgraph External_APIs [Third Party & Database Services]
        DrizzleClient -->|PgPool Connection| NeonDB[(Neon Serverless PostgreSQL)]
        PolarSDK -->|API Triggers| PolarGateway[Polar.sh Payment Gateway]
        PolarGateway -->|Signed Event Webhooks| WebhookListener[Polar Webhook API Handler]
        WebhookListener -->|Sync Subscription Status| DrizzleClient
    end

    classDef default fill:#09090b,stroke:#27272a,color:#fafafa;
    classDef highlight fill:#fff,stroke:#09090b,color:#09090b;
    class RouteGuard highlight;
```

---

## 2. Directory Hierarchy Map

Below is the directory map illustrating where the new components, routes, and utilities reside in the `src/` folder:

```text
/
├── .env.example                     # Reference file for environment credentials
├── drizzle.config.ts                # Drizzle kit configuration for db schemas
├── migrations/                      # Folder containing SQL migration assets
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Isolated layout grouping auth routes
│   │   │   ├── sign-in/
│   │   │   │   └── page.tsx         # Sign-in UI panel matching Ghib aesthetics
│   │   │   ├── sign-up/
│   │   │   │   └── page.tsx         # Sign-up UI panel with password matching validation
│   │   │   └── layout.tsx           # Layout wrapping auth sections in visual glassmorphism
│   │   ├── (dashboard)/             # Isolated layout grouping authenticated sections
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx         # Premium usage metrics, recent renders list, plan info
│   │   │   ├── billing/
│   │   │   │   └── page.tsx         # Plan cards & management checkout portals
│   │   │   ├── generate/
│   │   │   │   └── page.tsx         # Interface panel for running transformations
│   │   │   └── layout.tsx           # Dashboard dashboard navbar and session guard
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...better-auth]/
│   │   │   │       └── route.ts     # Better Auth wildcard API routes handler
│   │   │   └── webhooks/
│   │   │       └── polar/
│   │   │           └── route.ts     # Signed Polar.sh webhook endpoint sync
│   │   ├── layout.tsx               # Main root app layout
│   │   └── page.tsx                 # Landing page (modified to incorporate canvas frames)
│   ├── components/
│   │   ├── Hero/
│   │   │   └── index.tsx            # Updated canvas background & state CTA buttons
│   │   ├── StyleShowcase/
│   │   │   └── index.tsx            # Updated canvas scroll showcase background
│   │   ├── Gallery/
│   │   │   └── index.tsx            # Updated canvas scroll background
│   │   └── ui/
│   │       ├── FrameSequence.tsx    # Canvas rendering wrapper component with preloading & lazy loading
│   │       └── text-reveal.tsx
│   ├── db/
│   │   ├── index.ts                 # Drizzle client constructor
│   │   └── schema.ts                # Database relational tables
│   ├── actions/
│   │   ├── auth.ts                  # Server action helpers for registration and logins
│   │   ├── generate.ts              # Quota-guarded image transformation processors
│   │   ├── billing.ts               # Checkout portal Session generation Actions
│   │   └── usage.ts                 # Quota validation actions
│   ├── hooks/
│   │   ├── useFrameSequence.ts      # Animates requestAnimationFrame loop on Canvas
│   │   ├── useImagePreloader.ts     # Preloads images dynamically, skipping indices on mobile
│   │   └── useScrollSequence.ts     # Maps scroll progress properties to Frame indices
│   ├── lib/
│   │   ├── auth.ts                  # Better Auth server configuration settings
│   │   ├── auth-client.ts           # Better Auth client reference
│   │   └── store.ts                 # Client-side Zustand indicators
│   └── middleware.ts                # Next.js Edge route guard middleware redirects
```

---

## 3. Database Architecture & Drizzle Configuration

We configure a serverless PostgreSQL database hosted on Neon. We use Drizzle ORM to coordinate schemas, handle relations, and maintain migrations.

### 3.1. Database ER Diagram

```mermaid
erDiagram
    users ||--o{ sessions : "has"
    users ||--o{ accounts : "owns"
    users ||--o| subscriptions : "subscribes"
    users ||--o{ renders : "generates"
    users ||--o{ usage : "consumes"

    users {
        text id PK
        text name
        text email UK
        boolean emailVerified
        text image
        timestamp createdAt
        timestamp updatedAt
    }

    sessions {
        text id PK
        text userId FK
        text token UK
        timestamp expiresAt
        text ipAddress
        text userAgent
        timestamp createdAt
        timestamp updatedAt
    }

    accounts {
        text id PK
        text userId FK
        text providerId
        text accountId
        text idToken
        text accessToken
        text refreshToken
        timestamp accessTokenExpiresAt
        timestamp refreshTokenExpiresAt
        text scope
        text password
        timestamp createdAt
        timestamp updatedAt
    }

    subscriptions {
        text id PK
        text userId FK
        text plan "free | pro | studio"
        text status "active | canceled | past_due"
        integer monthlyLimit
        text polarSubscriptionId UK
        timestamp createdAt
        timestamp updatedAt
    }

    renders {
        text id PK
        text userId FK
        text sourceImage
        text generatedImage
        text style
        timestamp createdAt
    }

    usage {
        text id PK
        text userId FK
        text month "YYYY-MM"
        integer rendersUsed
        integer rendersRemaining
    }
```

### 3.2. Drizzle Configuration File (`drizzle.config.ts`)

```typescript
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
```

### 3.3. Database Schema Mapping (`src/db/schema.ts`)

This schema implements all requested schemas (`users`, `subscriptions`, `renders`, `usage`, `sessions`, `accounts`, `verification_tokens`) using Drizzle ORM definitions, mapping indices and relations.

```typescript
import { pgTable, text, timestamp, integer, boolean, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Better Auth Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Better Auth Sessions Table
export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
}));

// 3. Better Auth Accounts Table
export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  providerId: text('provider_id').notNull(),
  accountId: text('account_id').notNull(),
  idToken: text('id_token'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('accounts_user_id_idx').on(table.userId),
}));

// 4. Better Auth Verification Tokens Table
export const verificationTokens = pgTable('verification_tokens', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 5. Billing Subscriptions Table
export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey(), // Usually aligns with local ID or generatedUUID
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan', { enum: ['free', 'pro', 'studio'] }).default('free').notNull(),
  status: text('status', { enum: ['active', 'trialing', 'past_due', 'canceled', 'incomplete'] }).default('active').notNull(),
  monthlyLimit: integer('monthly_limit').default(3).notNull(), // Free is 3 renders/month
  polarSubscriptionId: text('polar_subscription_id').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex('subscriptions_user_id_idx').on(table.userId),
}));

// 6. Renders Table (Visual generation logs)
export const renders = pgTable('renders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sourceImage: text('source_image').notNull(),
  generatedImage: text('generated_image').notNull(),
  style: text('style').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('renders_user_id_idx').on(table.userId),
}));

// 7. Monthly Usage Table
export const usage = pgTable('usage', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  month: text('month').notNull(), // Format: 'YYYY-MM' (e.g. '2026-06')
  rendersUsed: integer('renders_used').default(0).notNull(),
  rendersRemaining: integer('renders_remaining').default(3).notNull(),
}, (table) => ({
  userMonthIdx: uniqueIndex('usage_user_month_idx').on(table.userId, table.month),
}));

// --- RELATIONS DEFINITIONS ---

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  renders: many(renders),
  usage: many(usage),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const rendersRelations = relations(renders, ({ one }) => ({
  user: one(users, {
    fields: [renders.userId],
    references: [users.id],
  }),
}));

export const usageRelations = relations(usage, ({ one }) => ({
  user: one(users, {
    fields: [usage.userId],
    references: [users.id],
  }),
}));
```

### 3.4. Database Client Connection (`src/db/index.ts`)

We establish connection pooling using Neon's serverless connection driver `@neondatabase/serverless` for optimal Edge-compatibility.

```typescript
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Enable caching/keep-alive connections for Serverless functions
neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is missing.');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

---

## 4. Authentication Architecture (Better Auth)

Better Auth is a Next-generation auth engine built specifically for modern TypeScript frameworks, handling cookies, password hashing, and edge-middleware mapping.

### 4.1. Server Settings (`src/lib/auth.ts`)

```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  // Social OAuth (Feature-flagged via env vars)
  socialProviders: {
    google: {
      enabled: process.env.ENABLE_GOOGLE_AUTH === 'true',
      clientId: process.env.GOOGLE_CLIENT_ID || 'dummy-id',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-secret',
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes caching
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL || 'http://localhost:3000'
  ],
});
```

### 4.2. Client References (`src/lib/auth-client.ts`)

```typescript
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
});
```

### 4.3. Next.js Wildcard API Route Handler (`src/app/api/auth/[...better-auth]/route.ts`)

```typescript
import { auth } from '@/lib/auth';
import { toNextRouteHandler } from 'better-auth/next-js';

const handler = toNextRouteHandler(auth);

export const GET = handler;
export const POST = handler;
```

### 4.4. Next.js Edge Middleware Redirects Guard (`src/middleware.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_ROUTES = ['/dashboard', '/generate', '/account', '/billing', '/history'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Detect if pathname matches a protected route prefix
  const isProtected = PROTECTED_ROUTES.some((route) => 
    pathname.startsWith(route)
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  // 2. Fetch session from Better Auth cookies
  // Better Auth stores active cookies as 'better-auth.session_token'
  const sessionToken = 
    request.cookies.get('better-auth.session_token') || 
    request.cookies.get('__Secure-better-auth.session_token');

  if (!sessionToken) {
    // Save intended destination parameter to redirect back post sign-in
    const redirectUrl = new URL('/sign-in', request.url);
    redirectUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Protect defined endpoints and avoid matching static files, public images, or api routes
    '/dashboard/:path*',
    '/generate/:path*',
    '/account/:path*',
    '/billing/:path*',
    '/history/:path*',
  ],
};
```

---

## 5. Auth UI Components (Premium Styling)

We build Sign Up and Sign In routes utilizing the Cormorant Garamond Serif typography, custom glassmorphic wrappers, and standard form structures.

### 5.1. Authentication Shared Layout (`src/app/(auth)/layout.tsx`)

```tsx
import { ReactNode } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background text-ink flex flex-col justify-between py-8">
      {/* Background Grids & Scrims */}
      <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-15 pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#050505_0%,rgba(122,215,209,0.04)_50%,#050505_100%)] pointer-events-none" />
      
      {/* Mini-Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6">
        <Link href="/" className="inline-flex items-center gap-2 group">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition group-hover:border-white/20">
            <Sparkles className="h-4 w-4 text-marine" />
          </span>
          <span className="font-serif text-xl tracking-tight text-ink">Ghib AI</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 my-8">
        <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.08] backdrop-blur-2xl rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          {/* Subtle colored glow top-left */}
          <div className="absolute -top-16 -left-16 h-32 w-32 rounded-full bg-marine/10 blur-[40px] pointer-events-none" />
          {children}
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="relative z-10 text-center text-xs text-muted/60">
        <p>&copy; 2026 Ghib AI. Secure authentication system.</p>
      </footer>
    </div>
  );
}
```

### 5.2. Sign Up Page (`src/app/(auth)/sign-up/page.tsx`)

Upon successful signup, the code hits database callbacks to create a default free subscription (monthly render quota limit = 3).

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { ArrowRight, Loader2 } from 'lucide-react';

const signUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm Password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpValues) => {
    setLoading(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
      image: null,
    });

    if (signUpError) {
      setError(signUpError.message || 'An error occurred during sign-up.');
      setLoading(false);
    } else {
      // Upon successful signup, Better Auth automatically triggers autoSignIn.
      // Better Auth creates the user in the database.
      // Drizzle triggers/listeners or direct server-actions handle subscription setups.
      router.push('/dashboard');
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">Create Account</h2>
        <p className="text-sm text-muted mt-2">Get started with 3 free monthly renders</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-medium mb-2" htmlFor="name">Name</label>
          <input
            id="name"
            type="text"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-11 px-4 text-sm focus:outline-none focus:border-white/30 text-ink transition"
            placeholder="John Doe"
            disabled={loading}
            {...register('name')}
          />
          {errors.name && <span className="text-xs text-rose mt-1 block">{errors.name.message}</span>}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-medium mb-2" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-11 px-4 text-sm focus:outline-none focus:border-white/30 text-ink transition"
            placeholder="you@example.com"
            disabled={loading}
            {...register('email')}
          />
          {errors.email && <span className="text-xs text-rose mt-1 block">{errors.email.message}</span>}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-medium mb-2" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-11 px-4 text-sm focus:outline-none focus:border-white/30 text-ink transition"
            placeholder="••••••••"
            disabled={loading}
            {...register('password')}
          />
          {errors.password && <span className="text-xs text-rose mt-1 block">{errors.password.message}</span>}
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-medium mb-2" htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-11 px-4 text-sm focus:outline-none focus:border-white/30 text-ink transition"
            placeholder="••••••••"
            disabled={loading}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && <span className="text-xs text-rose mt-1 block">{errors.confirmPassword.message}</span>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-accent hover:bg-white/90 text-background font-medium rounded-full flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-background" />
          ) : (
            <>
              Create Account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted">Already have an account? </span>
        <Link href="/sign-in" className="text-ink underline hover:text-accent transition">
          Sign In
        </Link>
      </div>
    </>
  );
}
```

### 5.3. Sign In Page (`src/app/(auth)/sign-in/page.tsx`)

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { ArrowRight, Loader2 } from 'lucide-react';

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type SignInValues = z.infer<typeof signInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      rememberMe: true,
    }
  });

  const onSubmit = async (data: SignInValues) => {
    setLoading(true);
    setError(null);

    const { error: signInError } = await authClient.signIn.email({
      email: data.email,
      password: data.password,
      dontRemember: !data.rememberMe,
    });

    if (signInError) {
      setError(signInError.message || 'Invalid email or password.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  return (
    <>
      <div className="text-center mb-8">
        <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">Welcome Back</h2>
        <p className="text-sm text-muted mt-2">Sign in to your creative workstation</p>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs uppercase tracking-wider text-muted font-medium mb-2" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-11 px-4 text-sm focus:outline-none focus:border-white/30 text-ink transition"
            placeholder="you@example.com"
            disabled={loading}
            {...register('email')}
          />
          {errors.email && <span className="text-xs text-rose mt-1 block">{errors.email.message}</span>}
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-xs uppercase tracking-wider text-muted font-medium" htmlFor="password">Password</label>
            <Link href="/forgot-password" className="text-xs text-muted hover:text-accent transition">
              Forgot Password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg h-11 px-4 text-sm focus:outline-none focus:border-white/30 text-ink transition"
            placeholder="••••••••"
            disabled={loading}
            {...register('password')}
          />
          {errors.password && <span className="text-xs text-rose mt-1 block">{errors.password.message}</span>}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-white h-4 w-4 bg-transparent border-white/15 rounded focus:ring-0"
              disabled={loading}
              {...register('rememberMe')}
            />
            Remember Me
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-accent hover:bg-white/90 text-background font-medium rounded-full flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01]"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-background" />
          ) : (
            <>
              Sign In
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted">Don't have an account? </span>
        <Link href="/sign-up" className="text-ink underline hover:text-accent transition">
          Sign Up
        </Link>
      </div>
    </>
  );
}
```

---

## 6. Server Database Action Observers (Db Sync)

To configure default subscriptions and quota limits cleanly, we run Db initialization inside Server Actions when the Better Auth schema creates user profiles.

### 6.1. Register Account Action Observer (`src/actions/auth.ts`)

```typescript
'use server';

import { db } from '@/db';
import { subscriptions, usage } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

/**
 * Initializes default user subscription values and monthly usage thresholds.
 * Run in server middleware or triggered during webhook sync / registration lifecycle hooks.
 */
export async function initializeUserRecords(userId: string) {
  const currentMonth = new Date().toISOString().substring(0, 7); // Format: 'YYYY-MM'

  try {
    // 1. Transaction to guarantee atomic setup of quota and subscription
    await db.transaction(async (tx) => {
      // Verify user doesn't already have a subscription to prevent duplicate initialization
      const existingSub = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      if (!existingSub) {
        // Create free subscription tier (Limit = 3)
        await tx.insert(subscriptions).values({
          id: `sub_${userId}`,
          userId: userId,
          plan: 'free',
          status: 'active',
          monthlyLimit: 3,
        });

        // Initialize current month's usage tracker
        await tx.insert(usage).values({
          id: `usg_${userId}_${currentMonth}`,
          userId: userId,
          month: currentMonth,
          rendersUsed: 0,
          rendersRemaining: 3,
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to initialize user subscription/usage records:', error);
    return { success: false, error: 'Database execution error' };
  }
}
```

---

## 7. Polar.sh Billing Integration

We map plans, instantiate checkout portal redirects, and handle secure webhooks sent by the payment service.

### 7.1. Plan Map Matrix

 we synchronize subscription features via Polar.sh webhook event handlers to enforce quotas:

| Tier | Price / Month | Limit (Monthly Renders) | Database String Key | Polar.sh Variant Key |
| :--- | :--- | :--- | :--- | :--- |
| **FREE** | $0.00 | 3 | `free` | *None* |
| **PRO** | $19.00 | 100 | `pro` | `polar_var_pro_123` |
| **STUDIO** | $49.00 | 500 | `studio` | `polar_var_studio_456` |

### 7.2. Billing Webhook Endpoint (`src/app/api/webhooks/polar/route.ts`)

Matches and syncs events `subscription.created`, `subscription.updated`, `subscription.cancelled`, and `checkout.completed`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { subscriptions, usage } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validatePolarWebhookSignature } from '@/lib/billing-utils';

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('webhook-signature') || '';

  // Validate webhook origin authenticity
  const isValid = validatePolarWebhookSignature(rawBody, signature, process.env.POLAR_WEBHOOK_SECRET);
  if (!isValid) {
    return new NextResponse('Webhook Signature Verification Failed', { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event = payload.type;
  const data = payload.data;

  // Resolve plan levels based on variant IDs registered on Polar.sh
  const getPlanDetails = (variantId: string) => {
    if (variantId === process.env.POLAR_PRO_VARIANT_ID) {
      return { plan: 'pro' as const, limit: 100 };
    }
    if (variantId === process.env.POLAR_STUDIO_VARIANT_ID) {
      return { plan: 'studio' as const, limit: 500 };
    }
    return { plan: 'free' as const, limit: 3 };
  };

  try {
    switch (event) {
      case 'checkout.completed':
      case 'subscription.created': {
        const userId = data.custom_metadata?.userId;
        const subscriptionId = data.subscription_id || data.id;
        const variantId = data.variant_id;
        
        if (!userId) break;

        const { plan, limit } = getPlanDetails(variantId);
        const currentMonth = new Date().toISOString().substring(0, 7);

        await db.transaction(async (tx) => {
          // Sync Subscription row
          await tx.insert(subscriptions).values({
            id: `sub_${userId}`,
            userId,
            plan,
            status: 'active',
            monthlyLimit: limit,
            polarSubscriptionId: subscriptionId,
            updatedAt: new Date(),
          }).onConflictDoUpdate({
            target: subscriptions.userId,
            set: {
              plan,
              status: 'active',
              monthlyLimit: limit,
              polarSubscriptionId: subscriptionId,
              updatedAt: new Date(),
            }
          });

          // Sync Quota Limit Row in Usage tracking
          await tx.insert(usage).values({
            id: `usg_${userId}_${currentMonth}`,
            userId,
            month: currentMonth,
            rendersUsed: 0,
            rendersRemaining: limit,
          }).onConflictDoUpdate({
            target: [usage.userId, usage.month],
            set: {
              rendersRemaining: limit,
            }
          });
        });
        break;
      }

      case 'subscription.updated': {
        const subscriptionId = data.id;
        const variantId = data.variant_id;
        const isCancelled = data.cancel_at_period_end;
        const status = data.status; // active, past_due, canceled
        
        const existingSub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.polarSubscriptionId, subscriptionId),
        });

        if (!existingSub) break;

        const { plan, limit } = getPlanDetails(variantId);
        const mappedStatus = isCancelled ? 'canceled' : (status === 'active' ? 'active' : 'past_due');

        await db.update(subscriptions)
          .set({
            plan,
            status: mappedStatus as any,
            monthlyLimit: limit,
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.polarSubscriptionId, subscriptionId));
        break;
      }

      case 'subscription.cancelled': {
        const subscriptionId = data.id;
        
        const existingSub = await db.query.subscriptions.findFirst({
          where: eq(subscriptions.polarSubscriptionId, subscriptionId),
        });

        if (!existingSub) break;

        // Reset user back to free plan
        await db.transaction(async (tx) => {
          await tx.update(subscriptions)
            .set({
              plan: 'free',
              status: 'canceled',
              monthlyLimit: 3,
              updatedAt: new Date(),
            })
            .where(eq(subscriptions.polarSubscriptionId, subscriptionId));
        });
        break;
      }

      default:
        console.log(`Unhandled webhooks signature event: ${event}`);
    }

    return new NextResponse('Webhook Processed', { status: 200 });
  } catch (error) {
    console.error('Failed to sync Polar webhook:', error);
    return new NextResponse('Database Synchronization Error', { status: 500 });
  }
}
```

### 7.3. Signature Validation Utility (`src/lib/billing-utils.ts`)

```typescript
import crypto from 'crypto';

/**
 * Validates HMAC-SHA256 signatures sent by Polar.sh
 */
export function validatePolarWebhookSignature(body: string, signatureHeader: string, secret?: string): boolean {
  if (!secret) {
    console.warn('POLAR_WEBHOOK_SECRET is not configured. Signature validation ignored.');
    return true; // Bypass signature validation in local/dev test setups if key is omitted
  }

  try {
    const [webhookId, timestamp, signature] = signatureHeader.split(',');
    
    // Construct signing message
    const message = `${webhookId}.${timestamp}.${body}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(expectedSignature, 'utf8')
    );
  } catch (err) {
    return false;
  }
}
```

### 7.4. Checkout Session Generator (`src/actions/billing.ts`)

```typescript
'use server';

import { authClient } from '@/lib/auth-client';
import { db } from '@/db';
import { subscriptions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';

/**
 * Generates direct payment URLs on Polar.sh, passing userId in custom_metadata to verify on webhooks.
 */
export async function getCheckoutSessionUrl(variantId: string) {
  // Better Auth utility to verify active session within server action context
  const headerData = await headers();
  const sessionData = await authClient.getSession({
    fetchOptions: {
      headers: headerData,
    }
  });

  if (!sessionData?.data?.user) {
    throw new Error('Unauthorized access request.');
  }

  const userId = sessionData.data.user.id;
  const userEmail = sessionData.data.user.email;

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`;
  const polarOrgName = process.env.POLAR_ORGANIZATION_NAME;

  // Build the checkout URL on Polar.sh
  const checkoutUrl = `https://polar.sh/${polarOrgName}/checkout?variant=${variantId}&email=${encodeURIComponent(userEmail)}&metadata=${encodeURIComponent(JSON.stringify({ userId }))}&success_url=${encodeURIComponent(returnUrl)}`;

  return { url: checkoutUrl };
}
```

---

## 8. Render Quotas & Generation Safety Guards

We prevent generation requests if the user exceeds their quota limit. Quotas are validated via server action guards before kicking off heavy AI GPU model pipelines.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client User
    participant Action as generateImage (Server Action)
    database DB as Neon Database
    participant GPU as AI Transformation GPU Node

    User->>Action: Trigger "Generate Artwork" Action
    Action->>DB: Query current month's usage records (usage table)
    DB-->>Action: Return: rendersUsed, rendersRemaining
    
    alt rendersRemaining <= 0
        Action-->>User: Return Error: "Quota Exceeded, please upgrade plan."
    else rendersRemaining > 0
        Action->>DB: Decrement rendersRemaining, Increment rendersUsed
        Action->>GPU: Send Payload request (sourceImage, style)
        GPU-->>Action: Return: generatedImage URL
        Action->>DB: Log Render event (renders table)
        Action-->>User: Return Success: generatedImage URL
    end
```

### 8.1. Guard Implementation Action (`src/actions/generate.ts`)

```typescript
'use server';

import { db } from '@/db';
import { usage, renders, subscriptions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { authClient } from '@/lib/auth-client';
import { randomUUID } from 'crypto';

interface GenerateImagePayload {
  sourceImage: string;
  style: string;
}

export async function generateImage(payload: GenerateImagePayload) {
  const headerData = await headers();
  const sessionData = await authClient.getSession({
    fetchOptions: {
      headers: headerData,
    }
  });

  if (!sessionData?.data?.user) {
    return { success: false, error: 'User is not authenticated' };
  }

  const userId = sessionData.data.user.id;
  const currentMonth = new Date().toISOString().substring(0, 7);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Get user subscription tier limit
      let sub = await tx.query.subscriptions.findFirst({
        where: eq(subscriptions.userId, userId),
      });

      // Fallback fallback if missing (sync error recovery)
      if (!sub) {
        sub = (await tx.insert(subscriptions).values({
          id: `sub_${userId}`,
          userId,
          plan: 'free',
          status: 'active',
          monthlyLimit: 3,
        }).returning())[0];
      }

      // 2. Query usage details for this month
      let userUsage = await tx.query.usage.findFirst({
        where: and(
          eq(usage.userId, userId),
          eq(usage.month, currentMonth)
        ),
      });

      // Initialize monthly record if missing
      if (!userUsage) {
        userUsage = (await tx.insert(usage).values({
          id: `usg_${userId}_${currentMonth}`,
          userId,
          month: currentMonth,
          rendersUsed: 0,
          rendersRemaining: sub.monthlyLimit,
        }).returning())[0];
      }

      // 3. Quota check
      if (userUsage.rendersRemaining <= 0) {
        return { success: false, error: 'Monthly quota exceeded. Please upgrade your subscription.' };
      }

      // 4. Update usage quotas inside transaction block to prevent race conditions
      const updatedUsage = await tx.update(usage)
        .set({
          rendersUsed: userUsage.rendersUsed + 1,
          rendersRemaining: userUsage.rendersRemaining - 1,
        })
        .where(and(
          eq(usage.userId, userId),
          eq(usage.month, currentMonth)
        ))
        .returning();

      return { success: true, remaining: updatedUsage[0].rendersRemaining };
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 5. Call external transformation API (Mock model endpoint run)
    const transformedImage = await callModelTransformationService(payload.sourceImage, payload.style);

    // 6. Record render record log
    const renderId = `rnd_${randomUUID()}`;
    await db.insert(renders).values({
      id: renderId,
      userId,
      sourceImage: payload.sourceImage,
      generatedImage: transformedImage,
      style: payload.style,
    });

    return {
      success: true,
      imageUrl: transformedImage,
      remaining: result.remaining
    };

  } catch (error) {
    console.error('Failed to run image transformation:', error);
    return { success: false, error: 'Internal server error occurred.' };
  }
}

// Simulates GPU model transformation workload
async function callModelTransformationService(source: string, style: string): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 4000)); // Simulate 4s rendering delay
  // Returns dummy premium styles path output
  return `https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=600&auto=format&fit=crop`;
}
```

---

## 9. Dashboard & Workspace Architecture

We build an clean, minimalist workspace matching Ghib's dark UI structure.

### 9.1. Main Workstation view (`src/app/(dashboard)/dashboard/page.tsx`)

This view aggregates usage limits, renders, active plan statuses, and generation triggers.

```tsx
import { db } from '@/db';
import { usage, subscriptions, renders } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Calendar, Zap, CreditCard, Clock, Image as ImageIcon } from 'lucide-react';

export default async function DashboardPage() {
  // 1. Authenticate session via headers
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect('/sign-in');
  }

  const userId = session.user.id;
  const currentMonth = new Date().toISOString().substring(0, 7);

  // 2. Pull database aggregates in parallel to avoid waterfalls
  const [subscriptionRecord, usageRecord, userRenders] = await Promise.all([
    db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, userId),
    }),
    db.query.usage.findFirst({
      where: and(eq(usage.userId, userId), eq(usage.month, currentMonth)),
    }),
    db.query.renders.findMany({
      where: eq(renders.userId, userId),
      orderBy: desc(renders.createdAt),
      limit: 5,
    }),
  ]);

  const plan = subscriptionRecord?.plan || 'free';
  const limit = subscriptionRecord?.monthlyLimit || 3;
  const used = usageRecord?.rendersUsed || 0;
  const remaining = usageRecord?.rendersRemaining ?? 3;
  const progressPercent = Math.min(100, Math.round((used / limit) * 100));

  return (
    <div className="section-shell py-12 text-ink">
      {/* Header Profile Greeting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-8">
        <div>
          <h1 className="font-serif text-4xl md:text-5xl tracking-tight text-ink">
            Workspace: {session.user.name}
          </h1>
          <p className="text-sm text-muted mt-2">Manage your rendering instances, active limits, and studio history</p>
        </div>
        <Link
          href="/generate"
          className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 font-medium text-background hover:bg-white/95 hover:scale-[1.01] transition"
        >
          <Sparkles className="h-4 w-4" />
          Transform Photo
        </Link>
      </div>

      {/* Grid Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Widget 1: Quota Tracking bar */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap className="h-20 w-20 text-marine" />
          </div>
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-rose" /> Usage Quota
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-serif text-ink">{remaining}</span>
            <span className="text-sm text-muted">/ {limit} remaining</span>
          </div>
          <div className="mt-6">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3 text-xs text-muted">
              <span>{used} Renders Used</span>
              <span>Resets monthly</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Subscription Plan Information */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <CreditCard className="h-20 w-20 text-ember" />
          </div>
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-marine" /> Active Plan
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-serif text-ink uppercase tracking-tight">
              {plan === 'free' ? 'Free Tier' : plan === 'pro' ? 'Pro Studio' : 'Enterprise Studio'}
            </span>
          </div>
          <div className="mt-6 flex gap-4">
            <Link
              href="/billing"
              className="text-xs font-medium text-ink underline hover:text-accent transition"
            >
              Subscription Portal
            </Link>
          </div>
        </div>

        {/* Widget 3: Rapid statistics */}
        <div className="bg-white/[0.02] border border-white/[0.08] rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ImageIcon className="h-20 w-20 text-rose" />
          </div>
          <h3 className="text-xs uppercase tracking-wider text-muted font-medium mb-4 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-ember" /> Total Outputs
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-serif text-ink">{userRenders.length}</span>
            <span className="text-sm text-muted">recent studio outputs</span>
          </div>
          <div className="mt-6">
            <Link href="/history" className="text-xs font-medium text-ink underline hover:text-accent transition">
              Browse full image logs
            </Link>
          </div>
        </div>
      </div>

      {/* Section: Recent Generations list */}
      <div className="mt-12">
        <h2 className="font-serif text-2xl text-ink mb-6 flex items-center gap-2">
          Recent Studio Transformations
        </h2>
        {userRenders.length === 0 ? (
          <div className="border border-white/10 rounded-xl bg-white/[0.01] p-12 text-center text-muted">
            <ImageIcon className="h-10 w-10 mx-auto text-muted/40 mb-3" />
            <p className="text-sm">No images transformed yet.</p>
            <Link href="/generate" className="text-xs text-accent underline mt-2 block">
              Generate your first model artwork
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {userRenders.map((render) => (
              <div
                key={render.id}
                className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/20 transition duration-300"
              >
                <img
                  src={render.generatedImage}
                  alt={`Style transformation output: ${render.style}`}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-3">
                  <span className="text-[10px] uppercase tracking-wider text-white/70">{render.style}</span>
                  <span className="text-xs text-ink font-serif truncate mt-1">
                    {new Date(render.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 10. Frame-Sequence Canvas Animation System

To achieve maximum scroll performance and bypass mobile hardware constraints, we replace local background `.mp4` video plays with canvas rendering driven by scroll position.

### 10.1. Canvas Scroll Component: `FrameSequence.tsx`

The component handles:
* Image lazy-preloading triggered on `IntersectionObserver` viewport entry.
* Smooth frame interpolation mapped dynamically using Framer Motion.
* Scale and Y transformations that mimic parallax video.
* Skipping alternating frames on mobile devices (`isMobile = true`) to fetch 60 frames instead of 120, reducing memory load by 50%.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import type { MotionValue } from 'framer-motion';
import { useScroll, useTransform, motion, useReducedMotion } from 'framer-motion';
import { useImagePreloader } from '@/hooks/useImagePreloader';
import { useFrameSequence } from '@/hooks/useFrameSequence';

interface FrameSequenceProps {
  folder: string;
  totalFrames?: number;
  className?: string;
  canvasClassName?: string;
  overlayClassName?: string;
  overlayOpacity?: number;
  // Optional target container to drive animation. Falls back to internal element if omitted.
  containerRef?: React.RefObject<HTMLElement | null>;
  offset?: [string, string];
  externalFrameIndex?: MotionValue<number>;
  parallax?: boolean;
}

export function FrameSequence({
  folder,
  totalFrames = 120,
  className,
  canvasClassName,
  overlayClassName,
  overlayOpacity = 0.45,
  containerRef,
  offset = ['start end', 'end start'],
  externalFrameIndex,
  parallax = false,
}: FrameSequenceProps) {
  const localContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isInViewport, setIsInViewport] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  // 1. Mobile Detection (Limits frames loaded on mobile targets)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 2. Lazy Loading: Intersect viewports to trigger dynamic loads
  useEffect(() => {
    const target = containerRef?.current || localContainerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInViewport(true);
          observer.disconnect(); // Keep active once user initiates entry
        }
      },
      {
        rootMargin: '400px', // Start preloading 400px before entry
        threshold: 0,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [containerRef]);

  // 3. Preload frames
  const { images, progress, isLoaded } = useImagePreloader(
    folder,
    totalFrames,
    isMobile && isInViewport
  );

  // 4. Transform scroll position into active frame steps
  const targetScrollRef = containerRef || localContainerRef;
  const { scrollYProgress } = useScroll({
    target: targetScrollRef,
    offset,
  });

  const localFrameIndex = useTransform(
    scrollYProgress,
    [0, 1],
    [0, images.length > 0 ? images.length - 1 : totalFrames - 1]
  );

  const activeFrameIndex = externalFrameIndex || localFrameIndex;

  // 5. Trigger draw functions to render onto Canvas
  useFrameSequence(canvasRef, images, activeFrameIndex);

  // Parallax calculations matching ParallaxVideo
  const y = useTransform(scrollYProgress, [0, 1], shouldReduceMotion || !parallax ? ['0%', '0%'] : ['0%', '18%']);
  const scale = useTransform(scrollYProgress, [0, 1], shouldReduceMotion || !parallax ? [1, 1] : [1, 1.08]);

  return (
    <div
      ref={localContainerRef}
      className={`relative w-full h-full overflow-hidden bg-background ${className || ''}`}
    >
      <motion.div
        style={{ y: parallax ? y : undefined, scale: parallax ? scale : undefined }}
        className="absolute inset-0 w-full h-full"
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full object-cover pointer-events-none block ${canvasClassName || ''}`}
          style={{
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}
        />
      </motion.div>

      {/* Subtle glass progress indicator */}
      {!isLoaded && isInViewport && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] uppercase tracking-widest text-muted">
              Syncing cinematic environment {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Overlay Mask */}
      <div
        className={`absolute inset-0 pointer-events-none z-10 ${overlayClassName || ''}`}
        style={overlayClassName ? undefined : { backgroundColor: 'var(--background)', opacity: overlayOpacity }}
      />
    </div>
  );
}
```

### 10.2. Page Components Updates

#### A. Hero Section (`src/components/Hero/index.tsx`)

Replaces the parallax background video with `/public/1/` canvas sequences. We bind scroll triggers from `'start start'` to `'end start'` to drive playback as the user scrolls the page.

```tsx
// Edit snippet in src/components/Hero/index.tsx
import { useRef } from 'react';
import { FrameSequence } from '@/components/ui/FrameSequence';

export function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);

  return (
    <section id="top" ref={heroRef} className="relative min-h-[92svh] overflow-hidden">
      {/* Dynamic Canvas-based Parallax Background */}
      <div className="absolute inset-0">
        <FrameSequence
          folder="1"
          totalFrames={120}
          containerRef={heroRef}
          offset={['start start', 'end start']}
          parallax
          overlayClassName="video-scrim"
        />
      </div>
      
      {/* Existing landing page elements remain unchanged */}
      {/* ... */}
    </section>
  );
}
```

#### B. Styles Showcase Section (`src/components/StyleShowcase/index.tsx`)

Replaces `/videos/styles.mp4` with a scroll-driven canvas mapping `/public/2/` folder frames.

```tsx
// Edit snippet in src/components/StyleShowcase/index.tsx
import { useRef } from 'react';
import { FrameSequence } from '@/components/ui/FrameSequence';

export function StyleShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section id="styles" ref={sectionRef} className="relative overflow-hidden py-24 sm:py-28">
      {/* Scroll-controlled canvas background */}
      <div className="absolute inset-0">
        <FrameSequence
          folder="2"
          totalFrames={120}
          containerRef={sectionRef}
          offset={['start end', 'end start']}
          overlayOpacity={0.72}
        />
      </div>
      
      {/* Existing styles selector grid layout remains unchanged */}
      {/* ... */}
    </section>
  );
}
```

#### C. Gallery Showcase Section (`src/components/Gallery/index.tsx`)

Replaces `/videos/gallery.mp4` with a scroll-driven canvas mapping `/public/3/` folder frames.

```tsx
// Edit snippet in src/components/Gallery/index.tsx
import { useRef } from 'react';
import { FrameSequence } from '@/components/ui/FrameSequence';

export function Gallery() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section id="showcase" ref={sectionRef} className="relative overflow-hidden py-24 sm:py-28">
      {/* Scroll-controlled background frames */}
      <div className="absolute inset-0">
        <FrameSequence
          folder="3"
          totalFrames={120}
          containerRef={sectionRef}
          offset={['start end', 'end start']}
          overlayOpacity={0.75}
        />
      </div>

      {/* Existing masonry grid gallery layout remains unchanged */}
      {/* ... */}
    </section>
  );
}
```

---

## 11. Security, Performance & Validation Strategies

### 11.1. Performance Strategy
1. **Garbage Collection:** Ensure the `<canvas>` components cancel pending `requestAnimationFrame` IDs and disconnect Intersection Observers on component unmount to prevent leaks.
2. **Image Preloader Cache:** Loaded frame sequences are cached inside a global module-level cache (`preloadedCache`) in `useImagePreloader.ts` to prevent duplicate network requests when navigating pages.
3. **Step Skips on Mobile:** Alternating frame steps (loading frame indices `1, 3, 5, 7...`) avoids memory leaks on older iOS and Android devices, keeping RAM usage below 10MB per sequence.

### 11.2. Security Strategy
1. **CSRF Protection:** Configured implicitly in Better Auth by validating incoming `Origin` and `Host` request headers.
2. **Password Hashing:** Better Auth uses high-strength hashing algorithms (bcrypt/scrypt) in server execution contexts to secure user password storage.
3. **Server Actions Validation:** Enforce input formatting inside server actions using Zod schema parses (`z.string().email()`, etc.).
4. **Environment Variable Validation:**
   Create an environment schema config block in `src/lib/env.ts` running at runtime startup:
   ```typescript
   import { z } from 'zod';

   const envSchema = z.object({
     DATABASE_URL: z.string().url(),
     BETTER_AUTH_SECRET: z.string().min(16),
     POLAR_ORGANIZATION_NAME: z.string(),
     POLAR_WEBHOOK_SECRET: z.string().optional(),
     NEXT_PUBLIC_APP_URL: z.string().url(),
   });

   export const env = envSchema.parse(process.env);
   ```

---

## 12. Environment Setup (`.env.example`)

Copy the variables below to `.env.local` to configure the credentials:

```bash
# ==============================================================================
# Neon Serverless Database
# ==============================================================================
DATABASE_URL="postgresql://neondb_owner:password@ep-cool-butterfly-a5.us-east-2.aws.neon.tech/neondb?sslmode=require"

# ==============================================================================
# Better Auth Configurations
# ==============================================================================
BETTER_AUTH_SECRET="super-secure-random-bytes-min-32-chars-long-here"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google Auth Feature Flag (Set to true to activate provider client-side)
ENABLE_GOOGLE_AUTH="false"
GOOGLE_CLIENT_ID="google-client-id-here"
GOOGLE_CLIENT_SECRET="google-client-secret-here"

# ==============================================================================
# Polar.sh Payment Configurations
# ==============================================================================
POLAR_ORGANIZATION_NAME="ghib-ai"
POLAR_WEBHOOK_SECRET="webhook-secret-key-provided-by-polar-portal"

# Variant configuration mappings
POLAR_PRO_VARIANT_ID="polar_var_pro_123"
POLAR_STUDIO_VARIANT_ID="polar_var_studio_456"
```

---

## 13. System Testing Strategy

We run testing suites targeting the critical layers of authentication, billing, and animations.

### 13.1. Authentication Tests
1. **Email Sign-Up Validation:** Verify validation failures on short passwords (<8 characters), invalid emails, or mismatching passwords.
2. **Access Guards Test:** Test direct endpoint curl hits to `/dashboard` without sending session token cookies. Verify a redirect occurs to `/sign-in`.
3. **Registration Callback Hook Verification:** Confirm that user registration successfully triggers the creation of corresponding `subscriptions` and `usage` rows with correct limits.

### 13.2. Billing Webhook Tests
Create a mock JSON script (`scripts/test-webhook.js`) to locally verify database plan changes:
```javascript
const crypto = require('crypto');

async function triggerMockWebhook() {
  const secret = 'test-secret';
  const body = JSON.stringify({
    type: 'subscription.created',
    data: {
      id: 'sub_test_999',
      variant_id: 'polar_var_pro_123',
      custom_metadata: { userId: 'usr_abc123' }
    }
  });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const webhookId = 'evt_test_111';
  const message = `${webhookId}.${timestamp}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(message).digest('hex');

  const signatureHeader = `${webhookId},${timestamp},${signature}`;

  const res = await fetch('http://localhost:3000/api/webhooks/polar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'webhook-signature': signatureHeader
    },
    body: body
  });

  console.log(`Response status received: ${res.status}`);
}
```

### 13.3. Quota Enforcement Checks
1. **Free Limit Threshold Test:** Artificially set `renders_remaining` to `0` inside PostgreSQL. Run the image generation Server Action, and assert that it blocks generation and returns `Monthly quota exceeded`.
2. **Quota Decrementation Verification:** Confirm that every successful render decrements the `renders_remaining` count and increments `renders_used`.

### 13.4. Frame Sequence Performance Testing
1. **Device Rendering Framerate:** Run Google Chrome DevTools Performance Profiling on the Hero section canvas scroll. Confirm frame draws keep CPU execution duration below 16ms to maintain 60 FPS.
2. **Mobile RAM Profiling:** Run heap snapshots inside Chrome DevTools on mobile presets. Verify preloader cache clears obsolete elements, maintaining memory allocations below 15MB.

---

## 14. Production Deployment Checklist

* [ ] Ensure `DATABASE_URL` uses production credentials with `sslmode=require` enabled.
* [ ] Verify `BETTER_AUTH_SECRET` is a 32-character or longer cryptographically secure random key.
* [ ] Set `NEXT_PUBLIC_APP_URL` and `BETTER_AUTH_URL` variables to matching Vercel domain endpoints in production settings.
* [ ] Input valid Polar.sh Product Variant IDs (`POLAR_PRO_VARIANT_ID` and `POLAR_STUDIO_VARIANT_ID`).
* [ ] Configure signed webhook endpoint URLs on the Polar.sh dashboard pointing to `https://yourdomain.com/api/webhooks/polar`.
* [ ] Run database migrations (`npx drizzle-kit push:pg` or run migration scripts) to deploy tables on Neon.
* [ ] Double-check that mobile alternate frame rendering optimizes bandwidth and RAM usage.
* [ ] Verify that unauthenticated requests to dashboard routes redirect to `/sign-in` with valid callback parameters.
