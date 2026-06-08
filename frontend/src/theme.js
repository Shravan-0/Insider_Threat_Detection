import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3282B8",
    },
    secondary: {
      main: "#0F4C75",
    },
    background: {
      default: "#1B262C",
      paper: "#0F4C75",
    },
    text: {
      primary: "#BBE1FA",
    },
  },
  typography: {
    fontFamily: "Roboto, sans-serif",
  },
});

export default theme;