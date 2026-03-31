import { CssBaseline, ThemeProvider } from "@mui/material";
import { Toaster } from "react-hot-toast";

import { AuthProvider } from "./auth/AuthContext";
import { AppRouter } from "./router";
import { theme } from "./theme";
import { AppErrorBoundary } from "./ui/AppErrorBoundary";

export function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppErrorBoundary>
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
      </AppErrorBoundary>
    </ThemeProvider>
  );
}
