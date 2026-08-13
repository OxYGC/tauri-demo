import { createTheme, type ThemeOptions } from "@mui/material/styles";

const sharedTokens = {
  primary: "#5b5fc7",
  primaryDark: "#4848b0",
};

export const getTheme = (mode: "light" | "dark") => {
  const isDark = mode === "dark";

  const base: ThemeOptions = {
    palette: {
      mode,
      primary: { main: sharedTokens.primary },
      secondary: { main: "#f50057" },
      info: { main: "#4a8eff" },
      success: { main: "#2eae66" },
      warning: { main: "#ff9800" },
      error: { main: "#ff5252" },
      ...(isDark
        ? {
            background: {
              default: "#0d0e11",
              paper: "#1a1b20",
            },
            text: {
              primary: "#f5f5f7",
              secondary: "#b8b8c0",
            },
            divider: "rgba(255,255,255,0.12)",
          }
        : {
            background: {
              default: "#f5f5f7",
              paper: "#ffffff",
            },
            text: {
              primary: "#1a1a1a",
              secondary: "#5f6368",
            },
          }),
    },
    typography: {
      fontFamily:
        '"Roboto", "Helvetica Neue", "PingFang SC", "Microsoft YaHei", sans-serif',
      h6: { fontWeight: 600, fontSize: "1rem" },
      button: { textTransform: "none" as const, fontWeight: 500 },
    },
    shape: { borderRadius: 8 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? "#0d0e11" : "#f5f5f7",
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
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            border: isDark
              ? "1px solid rgba(255,255,255,0.10)"
              : "1px solid rgba(0,0,0,0.06)",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            margin: "2px 8px",
            padding: "6px 12px",
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 500 },
        },
      },
    },
  };

  return createTheme(base);
};
