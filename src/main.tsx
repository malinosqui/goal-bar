import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import App from "./App";
import "./styles.css";
import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  colors: {
    blue: [
      '#e6f3ff',
      '#cce7ff',
      '#99ceff',
      '#66b5ff',
      '#339cff',
      '#0084ff',
      '#0066cc',
      '#004d99',
      '#003366',
      '#001a33',
    ],
  },
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
