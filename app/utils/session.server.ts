import { createCookieSessionStorage } from 'remix';

const sessionSecret = process.env.SESSION_SECRET || 'default_secret';

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'session',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day
    secrets: [sessionSecret],
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;