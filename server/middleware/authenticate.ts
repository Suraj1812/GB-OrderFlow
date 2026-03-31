import type { NextFunction, Request, Response } from "express";

import { cookieNames } from "../core/cookies.js";
import { AppError } from "../core/errors.js";
import { verifyAccessToken } from "../core/tokens.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: "dealer" | "head_office";
    displayName: string;
    email: string | null;
    dealerId?: string | null;
    dealerCode?: string | null;
  };
}

export function authenticate(request: AuthenticatedRequest, _response: Response, next: NextFunction) {
  const token = request.cookies?.[cookieNames.accessToken];

  if (!token) {
    next(new AppError(401, "UNAUTHORIZED", "Authentication required."));
    return;
  }

  const payload = verifyAccessToken(token);
  request.user = {
    id: payload.sub,
    role: payload.role,
    displayName: payload.displayName,
    email: payload.email,
    dealerId: payload.dealerId,
    dealerCode: payload.dealerCode,
  };
  next();
}

export function requireRole(role: "dealer" | "head_office") {
  return (request: AuthenticatedRequest, _response: Response, next: NextFunction) => {
    if (!request.user || request.user.role !== role) {
      next(new AppError(403, "FORBIDDEN", "You do not have access to this resource."));
      return;
    }

    next();
  };
}
