import type { SessionOptions } from 'iron-session';

export type SessionData = {
  steamid?: string;
  persona?: string;
  avatar?: string;
  isAdmin?: boolean;
};

export function getSessionOptions(): SessionOptions {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) throw new Error('SESSION_SECRET environment variable is required');
  if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
  return {
    password: secret,
    cookieName: 'tsx-session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    },
  };
}
