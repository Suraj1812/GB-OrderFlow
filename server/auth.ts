import jwt from "jsonwebtoken";
import type { NextFunction, Response } from "express";

import type { AuthenticatedRequest, SessionUser } from "./types.js";
import type { UserRole } from "../shared/contracts.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "gb-orderflow-local-dev-secret";

export function createSessionToken(user: SessionUser) {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "12h" });
}

export function authenticate(
  request: AuthenticatedRequest,
  response: Response,
  next: NextFunction,
) {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication required." });
    return;
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    request.user = jwt.verify(token, JWT_SECRET) as SessionUser;
    next();
  } catch {
    response.status(401).json({ message: "Your session has expired." });
  }
}

export function requireRole(role: UserRole) {
  return (
    request: AuthenticatedRequest,
    response: Response,
    next: NextFunction,
  ) => {
    if (!request.user || request.user.role !== role) {
      response.status(403).json({ message: "You do not have access to this resource." });
      return;
    }

    next();
  };
}

