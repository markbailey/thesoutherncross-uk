import type { SessionOptions } from 'iron-session';

export type SessionData = {
  steamid: string;
  persona: string;
  avatar: string;
  isAdmin: boolean;
};

export const sessionOptions: SessionOptions = {
  password: process.env['SESSION_SECRET'] ?? 'dev-secret-must-be-at-least-32-chars!!',
  cookieName: 'tsx-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
