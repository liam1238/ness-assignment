import { createTheme } from "@mui/material/styles";

const deepBlue = "#1a4d8c";
const hairline = "rgba(15, 23, 42, 0.1)";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: deepBlue,
      dark: "#143a6b",
      contrastText: "#ffffff",
    },
    error: {
      main: "#b42318",
    },
    success: {
      main: "#067647",
    },
    background: {
      default: "#f4f6f8",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#475569",
    },
    divider: hairline,
  },
  shape: {
    borderRadius: 11,
  },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h1: {
      fontSize: "1.375rem",
      fontWeight: 600,
      letterSpacing: "-0.02em",
    },
    h2: {
      fontSize: "1.125rem",
      fontWeight: 600,
    },
    body2: {
      fontSize: "0.875rem",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: "#f4f6f8",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          boxShadow: "none",
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: hairline,
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(15, 23, 42, 0.18)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: deepBlue,
            borderWidth: 1,
          },
        },
        input: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.8125rem",
          fontWeight: 500,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          height: 24,
          fontSize: "0.75rem",
          borderRadius: 6,
        },
        outlined: {
          borderColor: hairline,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: `1px solid ${hairline}`,
          boxShadow: "0 8px 32px rgba(15, 23, 42, 0.12)",
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 11,
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: hairline,
          fontSize: "0.875rem",
          paddingTop: 10,
          paddingBottom: 10,
        },
        head: {
          fontWeight: 600,
          color: "#334155",
          fontSize: "0.8125rem",
        },
      },
    },
  },
});