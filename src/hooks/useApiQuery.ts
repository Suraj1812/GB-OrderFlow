import { useEffect, useState, type DependencyList } from "react";
import axios from "axios";

export function useApiQuery<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  dependencies: DependencyList,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function run() {
      setLoading(true);
      setError(null);

      try {
        const result = await loader(controller.signal);
        if (active) {
          setData(result);
        }
      } catch (rawError) {
        if (controller.signal.aborted) {
          return;
        }

        if (active) {
          if (axios.isAxiosError(rawError)) {
            setError(
              rawError.response?.data?.message ??
                rawError.message ??
                "Request failed.",
            );
          } else if (rawError instanceof Error) {
            setError(rawError.message);
          } else {
            setError("Request failed.");
          }
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [...dependencies, version]);

  return {
    data,
    loading,
    error,
    refresh: () => setVersion((current) => current + 1),
  };
}

