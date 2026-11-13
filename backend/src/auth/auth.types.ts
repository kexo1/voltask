export type AuthenticatedUser = {
  id: string;
  email: string;
};

export type AuthUserResponse = {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
};

export type AuthCookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax';
  path: string;
  maxAge?: number;
};

export type AuthHttpResponse = {
  cookie(name: string, value: string, options: AuthCookieOptions): unknown;
  clearCookie(name: string, options: Omit<AuthCookieOptions, 'maxAge'>): unknown;
};

export type AuthenticatedRequest = {
  headers: { cookie?: string };
  method: string;
  user?: AuthenticatedUser;
};
