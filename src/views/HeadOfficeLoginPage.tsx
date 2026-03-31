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

import { headOfficeLoginSchema } from "../../shared/contracts";
import { useAuth } from "../auth/AuthContext";

export function HeadOfficeLoginPage() {
  const navigate = useNavigate();
  const { session, loginHeadOffice, getDefaultRoute } = useAuth();
  const [form, setForm] = useState({
    username: "admin",
    password: "GB@2026!",
  });
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    return <Navigate to={getDefaultRoute(session.role)} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = headOfficeLoginSchema.safeParse(form);

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Enter valid credentials.");
      return;
    }

    setSubmitting(true);

    try {
      await loginHeadOffice(parsed.data);
      toast.success("Head Office workspace ready.");
      navigate("/head-office/dashboard");
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
                <Typography variant="overline">Head Office Sign-In</Typography>
                <Typography variant="h2">Approve orders and push them toward ERP import.</Typography>
                <Typography color="text.secondary">
                  Pending queue oversight, exclusive discount entry, CSV export,
                  approved log tracking, and dealer plus SKU master management in one secure workspace.
                </Typography>
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 4 }}>
                  Discount visibility and approval rights are restricted to Head Office only.
                </Alert>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ width: "100%", maxWidth: 470 }}>
            <CardContent sx={{ p: { xs: 3, md: 4 } }}>
              <Stack component="form" spacing={2.5} onSubmit={handleSubmit}>
                <Box>
                  <Typography variant="h4">Secure access</Typography>
                  <Typography mt={0.75} color="text.secondary">
                    Use your Head Office credentials to continue.
                  </Typography>
                </Box>
                <TextField
                  label="Username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      username: event.target.value,
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
                  Enter Head Office portal
                </Button>
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

