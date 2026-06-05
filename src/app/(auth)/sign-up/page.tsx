'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { authClient } from '@/lib/auth-client';

const signUpSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm password is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get('callbackUrl') || '/generate';
  const callbackUrl = rawCallbackUrl.startsWith('/') ? rawCallbackUrl : '/generate';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
  });

  const onSubmit = async (data: SignUpValues) => {
    setLoading(true);
    setError(null);

    const { error: signUpError } = await authClient.signUp.email({
      email: data.email,
      password: data.password,
      name: data.name,
    });

    if (signUpError) {
      setError(signUpError.message || 'An error occurred during sign-up.');
      setLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="font-serif text-3xl leading-tight text-ink md:text-4xl">Create Account</h1>
        <p className="mt-2 text-sm text-muted">Open your creative workstation</p>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-ink transition focus:border-white/30 focus:outline-none"
            placeholder="John Doe"
            disabled={loading}
            {...register('name')}
          />
          {errors.name ? <span className="mt-1 block text-xs text-rose">{errors.name.message}</span> : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-ink transition focus:border-white/30 focus:outline-none"
            placeholder="you@example.com"
            disabled={loading}
            {...register('email')}
          />
          {errors.email ? <span className="mt-1 block text-xs text-rose">{errors.email.message}</span> : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-ink transition focus:border-white/30 focus:outline-none"
            placeholder="********"
            disabled={loading}
            {...register('password')}
          />
          {errors.password ? (
            <span className="mt-1 block text-xs text-rose">{errors.password.message}</span>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase text-muted" htmlFor="confirmPassword">
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="h-11 w-full rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm text-ink transition focus:border-white/30 focus:outline-none"
            placeholder="********"
            disabled={loading}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword ? (
            <span className="mt-1 block text-xs text-rose">{errors.confirmPassword.message}</span>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-medium text-background transition hover:scale-[1.01] hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-background" aria-hidden="true" />
          ) : (
            <>
              Create Account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm">
        <span className="text-muted">Already have an account? </span>
        <Link href="/sign-in" className="text-ink underline transition hover:text-accent">
          Sign In
        </Link>
      </div>
    </>
  );
}
