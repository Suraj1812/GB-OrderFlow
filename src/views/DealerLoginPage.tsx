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
import axios from "axios";
import { useState } from "react";
import toast from "react-hot-toast";
import { Link as RouterLink, Navigate, useNavigate } from "react-router-dom";

import { dealerLoginSchema } from "../../shared/contracts";
import { useAuth } from "../auth/AuthContext";

export function DealerLoginPage() {
  const navigate = useNavigate();
  const { session, loginDealer, getDefaultRoute } = useAuth();
  const [form, setForm] = useState({
    dealerCode: "GB-D001",
    password: "dealer123",
  });
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to={getDefaultRoute(session.role)} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = dealerLoginSchema.safeParse(form);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter valid credentials.");
      return;
    }

    setSubmitting(true);

    try {
      await loginDealer(parsed.data);
      toast.success("Dealer workspace ready.");
      navigate("/dealer/catalog");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message ?? "Sign-in failed.");
      } else {
        toast.error("Sign-in failed.");
      }
    } finally {
      setSubmitting(false);
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
                  Search the live catalogue, build your cart, submit the order, and
                  track approval status from any smartphone browser.
                </Typography>
                <Alert severity="info" sx={{ mt: 2, borderRadius: 4 }}>
                  Demo credentials are prefilled for the seeded environment.
                </Alert>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ width: "100%", maxWidth: 470 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                <Box>
                  <Typography variant="h4">Welcome back</Typography>
                  <Typography mt={0.75} color="text.secondary">
                    Sign in with your dealer code and password.
                  </Typography>
                </Box>
                <TextField
                  label="Dealer code"
                  value={form.dealerCode}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dealerCode: event.target.value,
                    }))
                  }
                />
                <TextField
                  label="Password"
                  type="password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                />
                <Button
                  type="submit"
                  size="large"
                  variant="contained"
                  disabled={submitting}
                  endIcon={<ArrowForwardRoundedIcon />}
                >
                  Enter dealer portal
                </Button>
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

