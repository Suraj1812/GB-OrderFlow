import { Alert, Collapse, Slide, Stack } from "@mui/material";
import { useEffect, useState } from "react";

type NetworkStatusDetail = {
  offline?: boolean;
  degraded?: boolean;
  recovering?: boolean;
  message?: string;
};

export function NetworkStatusBanner() {
  const [status, setStatus] = useState<NetworkStatusDetail>({
    offline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    message:
      typeof navigator !== "undefined" && !navigator.onLine
        ? "You're offline. The app will sync again once the connection is back."
        : "",
  });

  useEffect(() => {
    let clearTimer = 0;

    function handleStatus(event: Event) {
      const detail = (event as CustomEvent<NetworkStatusDetail>).detail;
      setStatus((current) => ({
        ...current,
        ...detail,
      }));

      if (detail.recovering) {
        window.clearTimeout(clearTimer);
        clearTimer = window.setTimeout(() => {
          setStatus({
            offline: false,
            degraded: false,
            recovering: false,
            message: "",
          });
        }, 2500);
      }
    }

    function handleOffline() {
      setStatus({
        offline: true,
        degraded: false,
        recovering: false,
        message: "You're offline. Orders and refreshes will wait for the connection to return.",
      });
    }

    function handleOnline() {
      setStatus({
        offline: false,
        degraded: false,
        recovering: true,
        message: "Connection restored. Refreshing live data.",
      });
    }

    window.addEventListener("gb:network-status", handleStatus as EventListener);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("gb:network-status", handleStatus as EventListener);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const isOpen = Boolean(status.offline || status.degraded || status.recovering);
  const severity = status.offline ? "warning" : status.degraded ? "error" : "success";

  return (
    <Slide in={isOpen} direction="down" mountOnEnter unmountOnExit>
      <Stack
        sx={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          width: "min(92vw, 720px)",
          zIndex: 1400,
        }}
      >
        <Collapse in={isOpen}>
          <Alert severity={severity} variant="filled">
            {status.message}
          </Alert>
        </Collapse>
      </Stack>
    </Slide>
  );
}
