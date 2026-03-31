import { QueryClient } from "@tanstack/react-query";
import axios from "axios";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry(failureCount, error) {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (status && status < 500 && status !== 429) {
            return false;
          }
        }

        return failureCount < 2;
      },
      retryDelay(attemptIndex) {
        return Math.min(400 * 2 ** attemptIndex, 2_000);
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
