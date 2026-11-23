import { Alert, Button, Group, Pagination, Paper, Select, Stack, Text, Title } from "@mantine/core";
import { IconUserPlus } from "@tabler/icons-react";
import { useState } from "react";
import { useEmployees, useMeta } from "../../api/queries";
import { AddEmployeeModal } from "../employee-actions/AddEmployeeModal";
import { EmployeeFilters } from "./EmployeeFilters";
import { EmployeeTable } from "./EmployeeTable";
import { hasActiveFilters } from "./url-state";
import { useEmployeeListQuery } from "./useEmployeeListQuery";

const PAGE_SIZES = ["25", "50", "100"];

export function EmployeesPage() {
  const { query, update, reset, sortBy } = useEmployeeListQuery();
  const [adding, setAdding] = useState(false);
  const meta = useMeta();
  const employees = useEmployees(query);
  const data = employees.data;
  const filtered = hasActiveFilters(query);

  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.page * data.pageSize, data.total) : 0;

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Title order={2}>Employees</Title>
        <Button leftSection={<IconUserPlus size={16} />} onClick={() => setAdding(true)}>
          Add employee
        </Button>
      </Group>

      <EmployeeFilters
        query={query}
        meta={meta.data}
        fetching={employees.isFetching}
        onChange={update}
      />

      {employees.isError ? (
        <Alert color="red" title="Couldn't load employees">
          <Text size="sm" mb="sm">
            {employees.error.message}
          </Text>
          <Button size="xs" variant="light" color="red" onClick={() => employees.refetch()}>
            Try again
          </Button>
        </Alert>
      ) : (
        <Paper withBorder radius="md" style={{ opacity: employees.isPlaceholderData ? 0.6 : 1 }}>
          <EmployeeTable
            items={data?.items}
            loading={employees.isPending}
            query={query}
            onSort={sortBy}
          />
          {data && data.total === 0 && (
            <Stack align="center" gap="xs" p="xl">
              <Text c="dimmed">No employees match these filters.</Text>
              {filtered && (
                <Button variant="light" onClick={reset}>
                  Clear filters
                </Button>
              )}
            </Stack>
          )}
        </Paper>
      )}

      {data && data.total > 0 && (
        <Group justify="space-between" wrap="wrap">
          <Text size="sm" c="dimmed" aria-live="polite">
            Showing {first.toLocaleString()}–{last.toLocaleString()} of{" "}
            {data.total.toLocaleString()} employees
          </Text>
          <Group gap="sm">
            <Pagination
              total={data.totalPages}
              value={data.page}
              onChange={(page) => update({ page })}
              siblings={1}
              size="sm"
            />
            <Select
              aria-label="Rows per page"
              data={PAGE_SIZES}
              value={String(query.pageSize)}
              onChange={(value) => value && update({ pageSize: Number(value) })}
              allowDeselect={false}
              w={80}
              size="xs"
            />
          </Group>
        </Group>
      )}
      <AddEmployeeModal opened={adding} meta={meta.data} onClose={() => setAdding(false)} />
    </Stack>
  );
}
