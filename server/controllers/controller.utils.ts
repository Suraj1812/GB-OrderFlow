import type { Request } from "express";

import type { SessionUser } from "../../shared/contracts.js";
import { AppError } from "../core/errors.js";
import type { AuthenticatedRequest } from "../middleware/authenticate.js";
import type { RequestMeta } from "../services/auth.service.js";

export function getRequestMeta(request: Request): RequestMeta {
  return {
    ipAddress: request.ip,
    userAgent: request.get("user-agent") ?? undefined,
  };
}

export function getSessionUser(request: AuthenticatedRequest): SessionUser {
  if (!request.user) {
    throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
  }

  return request.user;
}

export function getRequiredParam(value: string | string[] | undefined, label: string) {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError(400, "INVALID_REQUEST", `${label} is required.`);
  }

  return value;
}
