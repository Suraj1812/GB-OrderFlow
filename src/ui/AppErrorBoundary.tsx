import { Button, Paper, Stack, Typography } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { captureClientException } from "../lib/monitoring";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  public state: AppErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    captureClientException(error, {
      component: "AppErrorBoundary",
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Stack minHeight="100vh" alignItems="center" justifyContent="center" p={3}>
          <Paper sx={{ p: 4, maxWidth: 520, textAlign: "center" }}>
            <Stack spacing={2}>
              <Typography variant="h4">Something went wrong</Typography>
              <Typography color="text.secondary">
                The app hit an unexpected render error. Reload to recover the session.
              </Typography>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Reload app
              </Button>
            </Stack>
          </Paper>
        </Stack>
      );
    }

    return this.props.children;
  }
}
