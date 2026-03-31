import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import {
  AppBar,
  Avatar,
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const navigationItems = [
  {
    label: "Catalogue",
    icon: <HomeRoundedIcon />,
    href: "/dealer/catalog",
  },
  {
    label: "Orders",
    icon: <ReceiptLongRoundedIcon />,
    href: "/dealer/orders",
  },
] as const;

export function DealerShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, logoutAllSessions, session } = useAuth();

  return (
    <Box className="app-shell">
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          borderBottom: "1px solid rgba(26,26,46,0.08)",
          backgroundColor: "rgba(250,248,243,0.94)",
        }}
      >
        <Toolbar sx={{ minHeight: 78 }}>
          <Stack
            width="100%"
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Avatar
                variant="rounded"
                sx={{
                  bgcolor: "primary.main",
                  color: "common.white",
                  width: 44,
                  height: 44,
                  borderRadius: 3,
                }}
              >
                GB
              </Avatar>
              <Box>
                <Typography variant="subtitle1">Goel Brothers</Typography>
                <Typography variant="body2" color="text.secondary">
                  Dealer ordering portal
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Chip label={session?.dealerCode ?? "Dealer"} color="secondary" />
              <Button
                color="inherit"
                sx={{ display: { xs: "none", sm: "inline-flex" } }}
                onClick={logoutAllSessions}
              >
                Logout all
              </Button>
              <Button
                color="inherit"
                startIcon={<LogoutRoundedIcon />}
                onClick={logout}
              >
                Logout
              </Button>
            </Stack>
          </Stack>
        </Toolbar>
      </AppBar>

      <Container sx={{ py: { xs: 3, md: 4 }, pb: { xs: 12, md: 4 } }}>
        <Outlet />
      </Container>

      <Paper
        elevation={10}
        sx={{
          position: "fixed",
          left: 12,
          right: 12,
          bottom: 12,
          display: { xs: "block", md: "none" },
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <BottomNavigation
          showLabels
          value={location.pathname}
          onChange={(_event, value) => navigate(value)}
        >
          {navigationItems.map((item) => (
            <BottomNavigationAction
              key={item.href}
              label={item.label}
              icon={item.icon}
              value={item.href}
            />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
