const encoder = new TextEncoder();
const decoder = new TextDecoder();

export type JWTPayload = Record<string, unknown> & {
  iat?: number;
  exp?: number;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';

  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  return bytesToBase64Url(new Uint8Array(buffer));
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(encoder.encode(value));
}

function base64UrlToBytes(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = `${base64url}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const bytes = base64UrlToBytes(base64url);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function importHmacKey(secret: string, keyUsages: KeyUsage[]) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    keyUsages,
  );
}

export async function signJWT<T extends Record<string, unknown>>(
  payload: T,
  secret: string,
  expiresInSeconds: number,
): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = textToBase64Url(JSON.stringify(header));
  const payloadB64 = textToBase64Url(JSON.stringify(fullPayload));
  const message = `${headerB64}.${payloadB64}`;
  const key = await importHmacKey(secret, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  const signatureB64 = arrayBufferToBase64Url(signatureBuffer);

  return `${message}.${signatureB64}`;
}

export async function verifyJWT<T extends Record<string, unknown>>(
  token: string,
  secret: string,
): Promise<(T & JWTPayload) | null> {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const message = `${headerB64}.${payloadB64}`;
    const key = await importHmacKey(secret, ['verify']);
    const signatureBuffer = base64UrlToArrayBuffer(signatureB64);
    const isValid = await crypto.subtle.verify('HMAC', key, signatureBuffer, encoder.encode(message));

    if (!isValid) {
      return null;
    }

    const header = JSON.parse(decoder.decode(base64UrlToArrayBuffer(headerB64))) as {
      alg?: string;
      typ?: string;
    };

    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return null;
    }

    const payload = JSON.parse(decoder.decode(base64UrlToArrayBuffer(payloadB64))) as T & JWTPayload;
    const now = Math.floor(Date.now() / 1000);

    if (typeof payload.exp === 'number' && now > payload.exp) {
      return null;
    }

    return payload;
  } catch (error) {
    console.error('JWT verification error:', error);
    return null;
  }
}
