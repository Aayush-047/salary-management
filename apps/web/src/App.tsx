import { AppShell, Group, NavLink, Title } from "@mantine/core";
import { Navigate, NavLink as RouterNavLink, Route, Routes } from "react-router";
import { ApiStatus } from "./components/ApiStatus";
import { Placeholder } from "./pages/Placeholder";

const NAV_ITEMS = [
  { path: "/employees", label: "Employees" },
  { path: "/insights", label: "Insights" },
  { path: "/import", label: "Import" },
  { path: "/audit", label: "Audit log" },
] as const;

export function App() {
  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 220, breakpoint: "sm" }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4}>Salary Management</Title>
          <ApiStatus />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.path} component={RouterNavLink} to={item.path} label={item.label} />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Navigate to="/employees" replace />} />
          {NAV_ITEMS.map((item) => (
            <Route key={item.path} path={item.path} element={<Placeholder title={item.label} />} />
          ))}
          <Route path="*" element={<Placeholder title="Page not found" />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
