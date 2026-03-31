import crypto from "node:crypto";

import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";
import { AppError } from "../core/errors.js";

export function attachRequestContext(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const incomingId = request.header("x-request-id");
  const requestId =
    typeof incomingId === "string" && incomingId.trim().length > 0
      ? incomingId.trim()
      : crypto.randomUUID();

  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  response.setHeader("x-api-version", env.API_VERSION);
  next();
}

export function requestTimeoutGuard(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const timer = setTimeout(() => {
    if (response.headersSent || response.writableEnded) {
      return;
    }

    next(
      new AppError(
        503,
        "REQUEST_TIMEOUT",
        "The server is taking too long to process the request.",
      ),
    );
  }, env.REQUEST_TIMEOUT_MS);

  response.on("finish", () => clearTimeout(timer));
  response.on("close", () => clearTimeout(timer));

  next();
}
