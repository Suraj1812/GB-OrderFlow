interface ClientMonitoringContext {
  component?: string;
  requestId?: string;
  [key: string]: unknown;
}

export function captureClientException(error: unknown, context: ClientMonitoringContext = {}) {
  console.error("Captured client exception", {
    error,
    monitoring: {
      provider: "sentry-ready",
      configured: Boolean(import.meta.env.VITE_SENTRY_DSN),
    },
    ...context,
  });
}

export function captureClientMessage(message: string, context: ClientMonitoringContext = {}) {
  console.warn(message, {
    monitoring: {
      provider: "sentry-ready",
      configured: Boolean(import.meta.env.VITE_SENTRY_DSN),
    },
    ...context,
  });
}
