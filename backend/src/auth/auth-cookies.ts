import type { AuthHttpResponse } from './auth.types';
import {
  ACCESS_TOKEN_MAX_AGE_MS,
  REFRESH_TOKEN_MAX_AGE_MS,
} from './auth.constants';

export const ACCESS_COOKIE = 'voltask_access';
export const REFRESH_COOKIE = 'voltask_refresh';

const COOKIE_SECURE = process.env.NODE_ENV === 'production';

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | undefined {
  if (!cookieHeader) return undefined;

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex < 0) continue;

    if (cookie.slice(0, separatorIndex).trim() === name) {
      return cookie.slice(separatorIndex + 1).trim();
    }
  }

  return undefined;
}

export function setAuthCookies(
  response: AuthHttpResponse,
  accessToken: string,
  refreshToken: string,
  rememberMe: boolean,
): void {
  const sharedOptions = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax' as const,
  };

  response.cookie(ACCESS_COOKIE, accessToken, {
    ...sharedOptions,
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE_MS,
  });
  response.cookie(REFRESH_COOKIE, refreshToken, {
    ...sharedOptions,
    path: '/api/auth',
    ...(rememberMe ? { maxAge: REFRESH_TOKEN_MAX_AGE_MS } : {}),
  });
}

export function clearAuthCookies(response: AuthHttpResponse): void {
  const sharedOptions = {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: 'lax' as const,
  };

  response.clearCookie(ACCESS_COOKIE, { ...sharedOptions, path: '/' });
  response.clearCookie(REFRESH_COOKIE, {
    ...sharedOptions,
    path: '/api/auth',
  });
}
