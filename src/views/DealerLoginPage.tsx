import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";

import type { DealerLoginInput } from "../../shared/contracts";
import { dealerLoginSchema } from "../../shared/contracts";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function DealerLoginPage() {
  const navigate = useNavigate();
  const { session, loginDealer, getDefaultRoute } = useAuth();
  const isDevelopment = import.meta.env.DEV;
  const form = useForm<DealerLoginInput>({
    resolver: zodResolver(dealerLoginSchema),
    defaultValues: {
      dealerCode: isDevelopment ? "GB-D001" : "",
      password: isDevelopment ? "dealer123" : "",
    },
  });

  if (session) {
    return <Navigate to={getDefaultRoute(session.role)} replace />;
  }

  async function handleSubmit(values: DealerLoginInput) {
    try {
      await loginDealer(values);
      toast.success("Dealer workspace ready.");
      navigate("/dealer/catalog");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Sign-in failed."));
    }
  }

  return (
    <Box className="app-shell">
      <Container sx={{ py: { xs: 4, md: 8 } }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={3}>
          <Card className="mesh-panel" sx={{ flex: 1 }}>
            <CardContent sx={{ position: "relative", p: { xs: 3, md: 5 } }}>
              <Stack spacing={2}>
                <Typography variant="overline">Dealer Sign-In</Typography>
                <Typography variant="h2">Order stock without calling Head Office.</Typography>
                <Typography color="text.secondary">
                  Search the live catalogue, build your cart, submit orders, and track approval status from any phone, tablet, or desktop browser.
                </Typography>
                {isDevelopment ? (
                  <Alert severity="info" sx={{ mt: 2, borderRadius: 4 }}>
                    Seeded credentials are prefilled for the local environment.
                  </Alert>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ width: "100%", maxWidth: 470 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack
                component="form"
                spacing={2.5}
                onSubmit={form.handleSubmit((values) => void handleSubmit(values))}
              >
                <Box>
                  <Typography variant="h4">Welcome back</Typography>
                  <Typography mt={0.75} color="text.secondary">
                    Sign in with your dealer code and password.
                  </Typography>
                </Box>
                <TextField
                  label="Dealer code"
                  autoComplete="username"
                  {...form.register("dealerCode")}
                  error={Boolean(form.formState.errors.dealerCode)}
                  helperText={form.formState.errors.dealerCode?.message}
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  {...form.register("password")}
                  error={Boolean(form.formState.errors.password)}
                  helperText={form.formState.errors.password?.message}
                />
                <Button
                  type="submit"
                  size="large"
                  variant="contained"
                  disabled={form.formState.isSubmitting}
                  endIcon={<ArrowForwardRoundedIcon />}
                >
                  Enter dealer portal
                </Button>
                <Typography color="text.secondary" variant="body2">
                  Password access is managed by Head Office admin. Contact support if you need password help.
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Need Head Office access?{" "}
                  <Link component={RouterLink} to="/login/head-office">
                    Sign in here
                  </Link>
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
