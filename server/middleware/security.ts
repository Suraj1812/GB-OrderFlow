import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";

import { idempotencyKeySchema } from "../../shared/contracts.js";
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

  if (request.params) {
    request.params = sanitizeValue(request.params) as Request["params"];
  }

  next();
}

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: env.API_RATE_LIMIT_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: env.AUTH_RATE_LIMIT_WINDOW_MINUTES * 60_000,
  limit: env.AUTH_RATE_LIMIT_MAX_ATTEMPTS,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

export function requireIdempotencyKey(request: Request, _response: Response, next: NextFunction) {
  const parsed = idempotencyKeySchema.safeParse(request.get("x-idempotency-key"));

  if (!parsed.success) {
    next(
      new AppError(
        400,
        "INVALID_IDEMPOTENCY_KEY",
        parsed.error.issues[0]?.message ?? "A valid idempotency key is required.",
      ),
    );
    return;
  }

  next();
}

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
  if (
    !origin ||
    env.corsOrigins.includes(origin) ||
    origin === env.FRONTEND_ORIGIN ||
    origin === env.API_ORIGIN
  ) {
    callback(null, true);
    return;
  }

  callback(new Error("Blocked by CORS policy"));
}
