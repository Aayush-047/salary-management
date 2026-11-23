import { AppShell, Group, NavLink, Title } from "@mantine/core";
import { Navigate, NavLink as RouterNavLink, Route, Routes } from "react-router";
import { ApiStatus } from "./components/ApiStatus";
import { AuditLogPage } from "./features/audit/AuditLogPage";
import { CurrencySelect } from "./components/CurrencySelect";
import { EmployeeDetailPage } from "./features/employee-detail/EmployeeDetailPage";
import { ImportPage } from "./features/import/ImportPage";
import { EmployeesPage } from "./features/employees/EmployeesPage";
import { InsightsPage } from "./features/insights/InsightsPage";
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
          <Group gap="sm">
            <CurrencySelect />
            <ApiStatus />
          </Group>
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
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:code" element={<EmployeeDetailPage />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="*" element={<Placeholder title="Page not found" />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
