import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const featureCards = [
  {
    title: "Dealer ordering without noise",
    description:
      "Searchable SKU catalogue, mobile-first cart flow, and clean order tracking with zero pricing leakage.",
    icon: <Inventory2RoundedIcon color="secondary" />,
  },
  {
    title: "Head Office control",
    description:
      "Exclusive discount approval, same-day approval logs, and guarded role-based access for every action.",
    icon: <ShieldRoundedIcon color="secondary" />,
  },
  {
    title: "ERP-ready export speed",
    description:
      "Approve once, generate the CSV instantly, and replace manual typing with a structured upload workflow.",
    icon: <SpeedRoundedIcon color="secondary" />,
  },
] as const;

export function LandingPage() {
  const { session, getDefaultRoute } = useAuth();

  return (
    <Box className="app-shell">
      <Container sx={{ py: { xs: 4, md: 7 } }}>
        <Stack spacing={4}>
          <Paper className="mesh-panel" sx={{ p: { xs: 3, md: 5 }, overflow: "hidden" }}>
            <CardContent sx={{ position: "relative", p: 0 }}>
              <Stack spacing={3}>
                <Chip
                  label="Goel Brothers x Supreme Industries PVC Distribution"
                  color="secondary"
                  sx={{ alignSelf: "flex-start" }}
                />
                <Typography maxWidth={920} variant="h1">
                  Industrial ordering, rebuilt for dealers and Head Office.
                </Typography>
                <Typography maxWidth={760} color="text.secondary" fontSize="1.08rem">
                  A production-grade ordering system with dealer self-service,
                  approval controls, structured ERP export, and a visual language
                  tuned for a real distribution business instead of a generic SaaS clone.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  <Button
                    component={RouterLink}
                    to={session ? getDefaultRoute(session.role) : "/login/dealer"}
                    variant="contained"
                    color="primary"
                    endIcon={<ArrowOutwardRoundedIcon />}
                  >
                    {session ? "Open workspace" : "Dealer portal"}
                  </Button>
                  <Button
                    component={RouterLink}
                    to="/login/head-office"
                    variant="outlined"
                    color="inherit"
                  >
                    Head Office sign-in
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Paper>

          <Grid container spacing={3}>
            {featureCards.map((card) => (
              <Grid key={card.title} size={{ xs: 12, md: 4 }}>
                <Card sx={{ height: "100%" }}>
                  <CardContent sx={{ p: 3 }}>
                    <Stack spacing={2}>
                      <Box>{card.icon}</Box>
                      <Typography variant="h5">{card.title}</Typography>
                      <Typography color="text.secondary">{card.description}</Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={{ p: 3.5 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="overline">Dealer Experience</Typography>
                    <Typography variant="h4">Fast on low-end phones</Typography>
                    <Typography color="text.secondary">
                      Mobile-first catalogue search, quantity capture, cart review,
                      order submission, and order history without exposing stock,
                      discounts, or any other dealer data.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card>
                <CardContent sx={{ p: 3.5 }}>
                  <Stack spacing={1.5}>
                    <Typography variant="overline">Head Office Experience</Typography>
                    <Typography variant="h4">Approval, discount, export</Typography>
                    <Typography color="text.secondary">
                      Pending queue, live net calculation, rejection remarks, approved
                      log, master management, and CSV generation ready for the ERP import flow.
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}

