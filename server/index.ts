import "dotenv/config";

import type { Server } from "node:http";

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./core/logger.js";
import { captureServerException } from "./core/monitoring.js";
import { markShuttingDown } from "./core/runtime-state.js";
import { prisma } from "./prisma/client.js";

const app = createApp();
let shuttingDown = false;

async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
  } catch (error) {
    captureServerException(error, { component: "databaseDisconnect" });
  }
}

async function handleStartupError(error: NodeJS.ErrnoException) {
  captureServerException(error, { component: "startup" });
  logger.fatal(
    {
      err: error,
      host: env.host,
      port: env.PORT,
      code: error.code,
      syscall: error.syscall,
    },
    "Failed to start GB OrderFlow API",
  );

  await disconnectDatabase();
  process.exit(1);
}

async function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  markShuttingDown();
  logger.warn({ signal }, "Starting graceful shutdown");

  const forceExitTimer = setTimeout(() => {
    logger.error("Graceful shutdown timed out");
    process.exit(1);
  }, env.GRACEFUL_SHUTDOWN_MS);
  forceExitTimer.unref();

  try {
    if (server.listening) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    }
    await disconnectDatabase();
    clearTimeout(forceExitTimer);
    process.exit(0);
  } catch (error) {
    clearTimeout(forceExitTimer);
    captureServerException(error, { component: "shutdown" });
    process.exit(1);
  }
}

const server: Server = app.listen(env.PORT, env.host);

server.once("listening", () => {
  logger.info(
    {
      host: env.host,
      port: env.PORT,
      environment: env.NODE_ENV,
      version: env.APP_VERSION,
    },
    "GB OrderFlow API listening",
  );
});

server.once("error", (error: NodeJS.ErrnoException) => {
  void handleStartupError(error);
});

server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = env.REQUEST_TIMEOUT_MS + 1_000;

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

process.on("unhandledRejection", (error) => {
  captureServerException(error, { component: "unhandledRejection" });
});

process.on("uncaughtException", (error) => {
  captureServerException(error, { component: "uncaughtException" });
});
