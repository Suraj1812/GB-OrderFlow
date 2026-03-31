import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { AppError, isAppError } from "../core/errors.js";
import { logger } from "../core/logger.js";

export function notFoundHandler(_request: Request, _response: Response, next: NextFunction) {
  next(new AppError(404, "NOT_FOUND", "The requested resource was not found."));
}

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  next: NextFunction,
) {
  void next;

  if (isAppError(error)) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      details: error.details ?? null,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      response.status(409).json({
        code: "CONFLICT",
        message: "A record with the same unique field already exists.",
      });
      return;
    }
  }

  logger.error(
    {
      err: error,
      path: request.path,
      method: request.method,
    },
    "Unhandled server error",
  );

  response.status(500).json({
    code: "INTERNAL_SERVER_ERROR",
    message: "Something went wrong on the server.",
  });
}
