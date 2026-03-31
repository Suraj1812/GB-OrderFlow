import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import fs from "node:fs";
import path from "node:path";
import { pinoHttp } from "pino-http";

import { healthResponseSchema } from "../shared/contracts.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { isReady } from "./core/runtime-state.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { attachRequestContext, requestTimeoutGuard } from "./middleware/request-context.js";
import { apiRateLimiter, corsOriginValidator, sanitizeRequest } from "./middleware/security.js";
import { prisma } from "./prisma/client.js";
import { createRouter } from "./routes.js";

export function createApp(options?: { disableHttpLogger?: boolean }) {
  const app = express();
  const clientDistPath = path.resolve(process.cwd(), "dist");
  const apiRouter = createRouter();

  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");
  app.use(attachRequestContext);

  if (!options?.disableHttpLogger) {
    app.use(
      pinoHttp({
        logger,
        customProps: (request) => ({
          requestId: request.requestId,
        }),
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers[\"set-cookie\"]",
          ],
          censor: "[Redacted]",
        },
      }),
    );
  }
  app.use(
    cors({
      origin: corsOriginValidator,
      credentials: true,
    }),
  );
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: {
        policy: "cross-origin",
      },
      referrerPolicy: {
        policy: "no-referrer",
      },
      hsts: env.isProduction
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
    }),
  );
  app.use(compression());
  app.use(requestTimeoutGuard);
  app.use(express.json({ limit: `${env.BODY_LIMIT_KB}kb` }));
  app.use(express.urlencoded({ extended: false, limit: `${env.BODY_LIMIT_KB}kb` }));
  app.use(cookieParser());
  app.use(sanitizeRequest);

  app.get("/health", (request, response) => {
    response.status(200).json(
      healthResponseSchema.parse({
        ok: true,
        ready: isReady(),
        environment: env.NODE_ENV,
        version: env.APP_VERSION,
        timestamp: new Date().toISOString(),
        requestId: request.requestId,
      }),
    );
  });

  app.get("/ready", async (request, response, next) => {
    try {
      if (!isReady()) {
        response.status(503).json(
          healthResponseSchema.parse({
            ok: false,
            ready: false,
            environment: env.NODE_ENV,
            version: env.APP_VERSION,
            timestamp: new Date().toISOString(),
            requestId: request.requestId,
          }),
        );
        return;
      }

      await prisma.$queryRaw`SELECT 1`;
      response.status(200).json(
        healthResponseSchema.parse({
          ok: true,
          ready: true,
          environment: env.NODE_ENV,
          version: env.APP_VERSION,
          timestamp: new Date().toISOString(),
          requestId: request.requestId,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(`/api/${env.API_VERSION}`, apiRateLimiter, apiRouter);
  app.use("/api", apiRateLimiter, apiRouter);

  if (env.NODE_ENV === "production" && fs.existsSync(clientDistPath)) {
    app.use(
      express.static(clientDistPath, {
        index: false,
        setHeaders(response, filePath) {
          if (filePath.includes(`${path.sep}assets${path.sep}`)) {
            response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
            return;
          }

          response.setHeader("Cache-Control", "no-cache");
        },
      }),
    );

    app.get("/{*path}", (_request, response) => {
      response.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
