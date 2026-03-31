import { CssBaseline, ThemeProvider } from "@mui/material";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { queryClient } from "./api/query-client";
import { AuthProvider } from "./auth/AuthContext";
import { AppRouter } from "./router";
import { theme } from "./theme";
import { AppErrorBoundary } from "./ui/AppErrorBoundary";
import { NetworkStatusBanner } from "./ui/NetworkStatusBanner";

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
        <NetworkStatusBanner />
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppRouter />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  borderRadius: 16,
                  background: "#17182a",
                  color: "#fff",
                  padding: "14px 16px",
                },
              }}
            />
          </AuthProvider>
        </QueryClientProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
