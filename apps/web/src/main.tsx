import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "@mantine/notifications/styles.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./App";
import { DisplayCurrencyProvider } from "./components/DisplayCurrencyProvider";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <MantineProvider>
      {/* Bottom-right: top-right would cover the page's action buttons for several seconds. */}
      <Notifications position="bottom-right" />
      <QueryClientProvider client={queryClient}>
        <DisplayCurrencyProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </DisplayCurrencyProvider>
      </QueryClientProvider>
    </MantineProvider>
  </StrictMode>,
);
