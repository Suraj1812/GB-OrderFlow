import { logger } from "./logger.js";

interface MonitoringContext {
  requestId?: string;
  path?: string;
  method?: string;
  userId?: string;
  component?: string;
  [key: string]: unknown;
}

export function captureServerException(error: unknown, context: MonitoringContext = {}) {
  logger.error(
    {
      err: error,
      monitoring: {
        provider: "sentry-ready",
        configured: Boolean(process.env.SENTRY_DSN),
      },
      ...context,
    },
    "Captured server exception",
  );
}

export function captureServerMessage(message: string, context: MonitoringContext = {}) {
  logger.warn(
    {
      monitoring: {
        provider: "sentry-ready",
        configured: Boolean(process.env.SENTRY_DSN),
      },
      ...context,
    },
    message,
  );
}
