import type { Response } from "express";

import { env } from "../config/env.js";

export const cookieNames = {
  accessToken: "gb_access_token",
  refreshToken: "gb_refresh_token",
  csrfToken: "gb_csrf_token",
} as const;

function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
  };
}

export function setAuthCookies(
  response: Response,
  accessToken: string,
  refreshToken: string,
) {
  response.cookie(cookieNames.accessToken, accessToken, {
    ...baseCookieOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60 * 1000,
    path: "/",
  });

  response.cookie(cookieNames.refreshToken, refreshToken, {
    ...baseCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

export function setCsrfCookie(response: Response, csrfToken: string) {
  response.cookie(cookieNames.csrfToken, csrfToken, {
    httpOnly: false,
    secure: env.cookieSecure,
    sameSite: env.COOKIE_SAME_SITE,
    domain: env.COOKIE_DOMAIN,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(cookieNames.accessToken, { path: "/", domain: env.COOKIE_DOMAIN });
  response.clearCookie(cookieNames.refreshToken, {
    path: "/api/auth",
    domain: env.COOKIE_DOMAIN,
  });
  response.clearCookie(cookieNames.csrfToken, { path: "/", domain: env.COOKIE_DOMAIN });
}
