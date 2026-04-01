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

import type { HeadOfficeLoginInput } from "../../shared/contracts";
import { headOfficeLoginSchema } from "../../shared/contracts";
import { getApiErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";

export function HeadOfficeLoginPage() {
  const navigate = useNavigate();
  const { session, loginHeadOffice, getDefaultRoute } = useAuth();
  const form = useForm<HeadOfficeLoginInput>({
    resolver: zodResolver(headOfficeLoginSchema),
    defaultValues: {
      username: "admin",
      password: "GB@2026!",
    },
  });

  if (session) {
    return <Navigate to={getDefaultRoute(session.role)} replace />;
  }

  async function handleSubmit(values: HeadOfficeLoginInput) {
    try {
      await loginHeadOffice(values);
      toast.success("Head Office workspace ready.");
      navigate("/head-office/dashboard");
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
                <Typography variant="overline">Head Office Sign-In</Typography>
                <Typography variant="h2">Approve orders and govern the ERP flow.</Typography>
                <Typography color="text.secondary">
                  Secure approval rights, guarded discounts, clean auditability, and reliable CSV export in one operational workspace.
                </Typography>
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 4 }}>
                  Dealer accounts never see rates or discount controls.
                </Alert>
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
                  <Typography variant="h4">Secure access</Typography>
                  <Typography mt={0.75} color="text.secondary">
                    Use your Head Office credentials to continue.
                  </Typography>
                </Box>
                <TextField
                  label="Username"
                  autoComplete="username"
                  {...form.register("username")}
                  error={Boolean(form.formState.errors.username)}
                  helperText={form.formState.errors.username?.message}
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
                  Enter Head Office portal
                </Button>
                <Typography color="text.secondary" variant="body2">
                  Password access is managed by system admin. Contact the admin team if credentials need to be changed.
                </Typography>
                <Typography color="text.secondary" variant="body2">
                  Looking for dealer access?{" "}
                  <Link component={RouterLink} to="/login/dealer">
                    Switch portal
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
