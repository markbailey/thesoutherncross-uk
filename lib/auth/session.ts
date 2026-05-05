import type { SessionOptions } from 'iron-session';

export type SessionData = {
  steamid: string;
  persona: string;
  avatar: string;
  isAdmin: boolean;
};

const SESSION_SECRET = process.env['SESSION_SECRET'];
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

export const sessionOptions: SessionOptions = {
  password: SESSION_SECRET,
  cookieName: 'tsx-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
