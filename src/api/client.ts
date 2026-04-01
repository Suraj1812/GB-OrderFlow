import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import type { AuthResponse } from "../../shared/contracts";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retryAuth?: boolean;
  _retryCount?: number;
  _requestId?: string;
  skipAuthRefresh?: boolean;
  skipCircuitBreaker?: boolean;
};

type NetworkStatusDetail = {
  offline?: boolean;
  degraded?: boolean;
  recovering?: boolean;
  message?: string;
};

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const apiBaseUrl =
  import.meta.env.PROD && configuredApiBaseUrl?.startsWith("http")
    ? "/api"
    : configuredApiBaseUrl ?? "/api";
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_GET_RETRIES = 2;
const CIRCUIT_BREAKER_THRESHOLD = 4;
const CIRCUIT_BREAKER_COOLDOWN_MS = 20_000;

let csrfToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let browserEventsInitialized = false;

const circuitBreakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
};

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: REQUEST_TIMEOUT_MS,
});

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isMutatingMethod(method?: string) {
  const normalized = method?.toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function createRequestId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `gb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function emitNetworkStatus(detail: NetworkStatusDetail) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent<NetworkStatusDetail>("gb:network-status", { detail }));
}

function initializeBrowserNetworkEvents() {
  if (browserEventsInitialized || typeof window === "undefined") {
    return;
  }

  browserEventsInitialized = true;
  window.addEventListener("offline", () => {
    emitNetworkStatus({
      offline: true,
      message: "You're offline. The app will retry when your connection returns.",
    });
  });
  window.addEventListener("online", () => {
    emitNetworkStatus({
      offline: false,
      recovering: true,
      message: "Connection restored. Syncing fresh data.",
    });
  });
}

function readCsrfTokenFromResponse(response: AxiosResponse<unknown>) {
  const data = response.data;

  if (
    data &&
    typeof data === "object" &&
    "csrfToken" in data &&
    typeof data.csrfToken === "string"
  ) {
    csrfToken = data.csrfToken;
  }
}

function isCircuitBreakerOpen() {
  return circuitBreakerState.openUntil > Date.now();
}

function registerCircuitFailure(error: AxiosError) {
  const status = error.response?.status;
  const isFailureWorthTracking =
    status === undefined || status === 429 || status >= 500 || error.code === "ECONNABORTED";

  if (!isFailureWorthTracking) {
    return;
  }

  circuitBreakerState.consecutiveFailures += 1;
  emitNetworkStatus({
    degraded: true,
    message: "The service is responding slowly. Retrying critical requests.",
  });

  if (circuitBreakerState.consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerState.openUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    emitNetworkStatus({
      degraded: true,
      message: "The service is temporarily unstable. New requests will pause briefly.",
    });
  }
}

function resetCircuitBreaker() {
  circuitBreakerState.consecutiveFailures = 0;
  circuitBreakerState.openUntil = 0;
}

function shouldRetryGetRequest(error: AxiosError, config: RetryableConfig) {
  const method = (config.method ?? "get").toLowerCase();
  const status = error.response?.status;

  if (method !== "get") {
    return false;
  }

  if ((config._retryCount ?? 0) >= MAX_GET_RETRIES) {
    return false;
  }

  return status === undefined || status === 429 || status >= 500 || error.code === "ECONNABORTED";
}

function getRetryDelay(retryCount: number) {
  return Math.min(400 * 2 ** retryCount, 2_000);
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<AuthResponse>("/auth/refresh", undefined, {
        skipAuthRefresh: true,
        skipCircuitBreaker: true,
        headers: {
          "x-request-id": createRequestId(),
        },
      })
      .then((response) => {
        csrfToken = response.data.csrfToken;
        return response.data.csrfToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export function setCsrfToken(nextToken: string | null) {
  csrfToken = nextToken;
}

export function getApiErrorMessage(error: unknown, fallback = "Request failed.") {
  if (isOffline()) {
    return "You're offline. Reconnect and try again.";
  }

  if (axios.isAxiosError(error)) {
    if (error.code === "ERR_CIRCUIT_OPEN") {
      return "The service is temporarily busy. Please try again in a few seconds.";
    }

    if (error.code === "ECONNABORTED") {
      return "The request timed out. Please try again.";
    }

    return (
      error.response?.data?.message ??
      error.response?.data?.code ??
      error.message ??
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

initializeBrowserNetworkEvents();

apiClient.interceptors.request.use((config) => {
  const nextConfig = config as RetryableConfig;
  nextConfig._requestId = nextConfig._requestId ?? createRequestId();
  nextConfig.headers.set("x-request-id", nextConfig._requestId);

  if (csrfToken && isMutatingMethod(nextConfig.method)) {
    nextConfig.headers.set("x-csrf-token", csrfToken);
  }

  if (isOffline()) {
    emitNetworkStatus({
      offline: true,
      message: "You're offline. Requests will resume when the connection returns.",
    });
    return Promise.reject(
      new AxiosError("Offline", "ERR_NETWORK", nextConfig),
    );
  }

  if (!nextConfig.skipCircuitBreaker && isCircuitBreakerOpen()) {
    return Promise.reject(
      new AxiosError(
        "Circuit breaker open",
        "ERR_CIRCUIT_OPEN",
        nextConfig,
      ),
    );
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => {
    readCsrfTokenFromResponse(response);
    resetCircuitBreaker();
    emitNetworkStatus({
      offline: false,
      degraded: false,
    });
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as RetryableConfig | undefined;

    if (!config) {
      return Promise.reject(error);
    }

    const requestUrl = String(config.url ?? "");
    const status = error.response?.status;

    if (
      status === 401 &&
      !config.skipAuthRefresh &&
      !config._retryAuth &&
      !requestUrl.includes("/auth/refresh")
    ) {
      config._retryAuth = true;

      try {
        await refreshSession();
        return apiClient.request(config);
      } catch (refreshError) {
        csrfToken = null;
        window.dispatchEvent(new CustomEvent("gb:session-expired"));
        return Promise.reject(refreshError);
      }
    }

    if (shouldRetryGetRequest(error, config)) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      const delay = getRetryDelay(config._retryCount);
      emitNetworkStatus({
        degraded: true,
        message: "Network is unstable. Retrying automatically.",
      });
      await wait(delay);
      return apiClient.request(config);
    }

    registerCircuitFailure(error);

    if (error.code === "ECONNABORTED") {
      emitNetworkStatus({
        degraded: true,
        message: "The network is slow. Some requests may take longer than usual.",
      });
    }

    return Promise.reject(error);
  },
);
