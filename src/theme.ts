import { alpha, createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#1a1a2e",
      dark: "#11111f",
      light: "#2b2f4f",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#c0392b",
      dark: "#9e2f24",
      light: "#d56559",
      contrastText: "#ffffff",
    },
    success: {
      main: "#1c7c54",
    },
    warning: {
      main: "#b7791f",
    },
    error: {
      main: "#c0392b",
    },
    background: {
      default: "#f4f1ea",
      paper: "#fffdf9",
    },
    text: {
      primary: "#161725",
      secondary: "#5f6472",
    },
    divider: alpha("#1a1a2e", 0.08),
  },
  shape: {
    borderRadius: 20,
  },
  typography: {
    fontFamily: [
      "system-ui",
      "-apple-system",
      "BlinkMacSystemFont",
      "\"Segoe UI\"",
      "\"Helvetica Neue\"",
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontSize: "3.4rem",
      fontWeight: 800,
      letterSpacing: "-0.06em",
      lineHeight: 0.95,
    },
    h2: {
      fontSize: "2.6rem",
      fontWeight: 800,
      letterSpacing: "-0.04em",
    },
    h3: {
      fontSize: "1.8rem",
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    h4: {
      fontSize: "1.35rem",
      fontWeight: 750,
    },
    h5: {
      fontSize: "1.1rem",
      fontWeight: 750,
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
      letterSpacing: "-0.01em",
    },
    subtitle1: {
      fontWeight: 650,
    },
    overline: {
      letterSpacing: "0.14em",
      fontWeight: 800,
      color: "#8b2d22",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          minHeight: "100vh",
          background: "linear-gradient(180deg, #faf8f3 0%, #f1ede5 100%)",
        },
        "#root": {
          minHeight: "100vh",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 28,
          border: `1px solid ${alpha("#1a1a2e", 0.08)}`,
          boxShadow: "0 10px 26px rgba(16, 19, 33, 0.06)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          borderRadius: 999,
          paddingInline: 18,
        },
        containedPrimary: {
          boxShadow: "0 10px 20px rgba(26, 26, 46, 0.12)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          fontWeight: 700,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 18,
          backgroundColor: alpha("#ffffff", 0.92),
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: alpha("#1a1a2e", 0.08),
        },
        head: {
          fontWeight: 800,
          color: "#4f5565",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundImage: "none",
          borderColor: alpha("#1a1a2e", 0.08),
        },
      },
    },
  },
});
