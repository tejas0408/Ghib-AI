export const SESSION_COOKIE_NAME = 'ghib_session';
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
export const REMEMBERED_SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

const DEVELOPMENT_JWT_SECRET = 'development-only-fallback-secret-32-chars';

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
  }

  return DEVELOPMENT_JWT_SECRET;
}
