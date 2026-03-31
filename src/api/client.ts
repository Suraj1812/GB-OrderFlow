import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import type { AuthResponse } from "../../shared/contracts";

type RetryableConfig = InternalAxiosRequestConfig & {
  _retryAuth?: boolean;
  _retryCount?: number;
  skipAuthRefresh?: boolean;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

let csrfToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 15_000,
});

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function isMutatingMethod(method?: string) {
  const normalized = method?.toUpperCase();
  return normalized === "POST" || normalized === "PUT" || normalized === "PATCH" || normalized === "DELETE";
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

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post<AuthResponse>("/auth/refresh")
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
  if (axios.isAxiosError(error)) {
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

apiClient.interceptors.request.use((config) => {
  const nextConfig = config as RetryableConfig;

  if (csrfToken && isMutatingMethod(nextConfig.method)) {
    nextConfig.headers.set("x-csrf-token", csrfToken);
  }

  return nextConfig;
});

apiClient.interceptors.response.use(
  (response) => {
    readCsrfTokenFromResponse(response);
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

    const method = (config.method ?? "get").toLowerCase();
    if (
      method === "get" &&
      (status === undefined || status === 429 || status >= 500) &&
      (config._retryCount ?? 0) < 1
    ) {
      config._retryCount = (config._retryCount ?? 0) + 1;
      await wait(300);
      return apiClient.request(config);
    }

    return Promise.reject(error);
  },
);
