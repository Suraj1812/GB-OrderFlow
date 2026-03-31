import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

import { env } from "../config/env.js";
import { cookieNames } from "../core/cookies.js";
import { AppError } from "../core/errors.js";

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.split("\0").join("").trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, currentValue]) => [
        key,
        sanitizeValue(currentValue),
      ]),
    );
  }

  return value;
}

export function sanitizeRequest(request: Request, _response: Response, next: NextFunction) {
  if (request.body) {
    request.body = sanitizeValue(request.body);
  }

  if (request.query) {
    request.query = sanitizeValue(request.query) as Request["query"];
  }

  next();
}

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

export function requireCsrf(request: Request, _response: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const cookieToken = request.cookies?.[cookieNames.csrfToken];
  const headerToken = request.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    next(new AppError(403, "CSRF_VALIDATION_FAILED", "Invalid CSRF token."));
    return;
  }

  next();
}

export function corsOriginValidator(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
  if (!origin || env.corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Blocked by CORS policy"));
}
