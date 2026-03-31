import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import fs from "node:fs";
import path from "node:path";

import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { apiRateLimiter, corsOriginValidator, sanitizeRequest } from "./middleware/security.js";
import { createRouter } from "./routes.js";

export function createApp(options?: { disableHttpLogger?: boolean }) {
  const app = express();
  const clientDistPath = path.resolve(process.cwd(), "dist");

  app.set("trust proxy", env.TRUST_PROXY);

  if (!options?.disableHttpLogger) {
    app.use(
      pinoHttp({
        logger,
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
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: "200kb" }));
  app.use(express.urlencoded({ extended: false, limit: "200kb" }));
  app.use(cookieParser());
  app.use(sanitizeRequest);
  app.use("/api", apiRateLimiter, createRouter());

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
