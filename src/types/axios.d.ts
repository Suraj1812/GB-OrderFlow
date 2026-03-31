import "axios";

declare module "axios" {
  interface AxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipCircuitBreaker?: boolean;
  }

  interface InternalAxiosRequestConfig {
    skipAuthRefresh?: boolean;
    skipCircuitBreaker?: boolean;
    _retryAuth?: boolean;
    _retryCount?: number;
    _requestId?: string;
  }
}
