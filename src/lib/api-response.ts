import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
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

export async function getAuthenticatedUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}
