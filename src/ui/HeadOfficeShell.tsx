import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import WidgetsRoundedIcon from "@mui/icons-material/WidgetsRounded";
import {
  AppBar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const drawerWidth = 270;

const navigationItems = [
  {
    label: "Dashboard",
    href: "/head-office/dashboard",
    icon: <DashboardRoundedIcon />,
  },
  {
    label: "Order Queue",
    href: "/head-office/orders",
    icon: <ReceiptLongRoundedIcon />,
  },
  {
    label: "Dealer Master",
    href: "/head-office/masters/dealers",
    icon: <GroupRoundedIcon />,
  },
  {
    label: "SKU Master",
    href: "/head-office/masters/skus",
    icon: <WidgetsRoundedIcon />,
  },
] as const;

function SidebarContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, logoutAllSessions, session } = useAuth();

  return (
    <Stack height="100%">
      <Stack spacing={2} p={3}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            component="img"
            src="/gb-orderflow-logo.svg"
            alt="GB OrderFlow logo"
            sx={{
              width: 48,
              height: 48,
              display: "block",
            }}
          />
          <Box>
            <Typography variant="subtitle1">Goel Brothers</Typography>
            <Typography variant="body2" color="text.secondary">
              Head Office control room
            </Typography>
          </Box>
        </Stack>
        <Chip
          color="secondary"
          label={session?.displayName ?? "Head Office"}
          sx={{ alignSelf: "flex-start" }}
        />
      </Stack>
      <Divider />
      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navigationItems.map((item) => {
          const selected = location.pathname === item.href;

          return (
            <ListItemButton
              key={item.href}
              selected={selected}
              onClick={() => navigate(item.href)}
              sx={{ borderRadius: 3, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          );
        })}
      </List>
      <Box p={2}>
        <Button
          fullWidth
          variant="text"
          color="inherit"
          sx={{ mb: 1 }}
          onClick={logoutAllSessions}
        >
          Logout all sessions
        </Button>
        <Button
          fullWidth
          variant="outlined"
          color="inherit"
          startIcon={<LogoutRoundedIcon />}
          onClick={logout}
        >
          Logout
        </Button>
      </Box>
    </Stack>
  );
}

export function HeadOfficeShell() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "1px solid rgba(26,26,46,0.08)",
          },
        }}
        open
      >
        <SidebarContent />
      </Drawer>

      <Drawer
        variant="temporary"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": {
            width: drawerWidth,
          },
        }}
      >
        <SidebarContent />
      </Drawer>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
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
              alignItems="center"
              justifyContent="space-between"
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <IconButton
                  sx={{ display: { xs: "inline-flex", md: "none" } }}
                  onClick={() => setDrawerOpen(true)}
                >
                  <MenuRoundedIcon />
                </IconButton>
                <Box>
                  <Typography variant="subtitle1">
                    Order approval and master control
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Secure workspace for discounts, approvals, and ERP exports
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Toolbar>
        </AppBar>

        <Box sx={{ p: { xs: 3, md: 4 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
