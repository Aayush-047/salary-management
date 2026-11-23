import type { RecentChangesQuery } from "@salary/shared";
import {
  Alert,
  Anchor,
  Badge,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { Link, useLocation, useSearchParams } from "react-router";
import { useRecentChanges } from "../../api/queries";
import { backLinkState } from "../../lib/back-link";
import { latestSearchParams } from "../../lib/search-params";
import { formatMoney } from "../../lib/money";
import { formatChangePct, reasonLabel } from "../employee-detail/format";
import { InsightFilters } from "./InsightFilters";
import { DEFAULT_RECENT, parseRecent, stateParams } from "./tab-state";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="xl" fw={700} mt={4}>
        {value}
      </Text>
    </Paper>
  );
}

const pct = (value: number | null) => formatChangePct(value) ?? "—";

/** Raises in a period: how many, how big, why, and the largest ones. */
export function RecentChangesTab() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const state = parseRecent(params);
  const recent = useRecentChanges(state);
  const data = recent.data;

  const update = (change: Partial<RecentChangesQuery>) => {
    const latest = latestSearchParams();
    setParams(stateParams({ ...parseRecent(latest), ...change }, DEFAULT_RECENT, latest));
  };
  const linkState = backLinkState(
    `${location.pathname}${location.search}`,
    "Back to recent changes",
  );

  return (
    <Stack gap="md">
      <Group align="flex-end" gap="sm" wrap="wrap">
        <TextInput
          type="date"
          label="From"
          value={state.from ?? data?.from ?? ""}
          onChange={(e) => update({ from: e.currentTarget.value || undefined })}
          w={170}
        />
        <TextInput
          type="date"
          label="To"
          value={state.to ?? data?.to ?? ""}
          onChange={(e) => update({ to: e.currentTarget.value || undefined })}
          w={170}
        />
        <InsightFilters filters={state} onApply={update} />
      </Group>
      <Text size="xs" c="dimmed" mt={-8}>
        Raises compare each pay change with the person's previous pay. Hires and relocations (a
        currency change) are not counted.
      </Text>

      {recent.isError ? (
        <Alert color="red" title="Couldn't load recent changes">
          {recent.error.message}
        </Alert>
      ) : !data ? (
        <Skeleton height={300} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <Tile label="Pay changes" value={data.summary.changes.toLocaleString("en-US")} />
            <Tile label="Employees" value={data.summary.employees.toLocaleString("en-US")} />
            <Tile label="Average raise" value={pct(data.summary.averageRaisePct)} />
            <Tile label="Median raise" value={pct(data.summary.medianRaisePct)} />
          </SimpleGrid>

          {data.summary.changes === 0 ? (
            <Text c="dimmed">No pay changes in this period for these employees.</Text>
          ) : (
            <SimpleGrid
              cols={{ base: 1, lg: 3 }}
              style={{ opacity: recent.isPlaceholderData ? 0.6 : 1 }}
            >
              <Paper withBorder radius="md" p="md">
                <Title order={4} mb="sm">
                  By reason
                </Title>
                <Table aria-label="Raises by reason">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Reason</Table.Th>
                      <Table.Th ta="right">Changes</Table.Th>
                      <Table.Th ta="right">Avg raise</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.byReason.map((row) => (
                      <Table.Tr key={row.reason}>
                        <Table.Td>{reasonLabel(row.reason)}</Table.Td>
                        <Table.Td ta="right">{row.changes.toLocaleString("en-US")}</Table.Td>
                        <Table.Td ta="right">{pct(row.averageRaisePct)}</Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Paper>

              <Paper withBorder radius="md" p="md" style={{ gridColumn: "span 2" }}>
                <Title order={4} mb="sm">
                  Largest raises
                </Title>
                <Table.ScrollContainer minWidth={620}>
                  <Table aria-label="Largest raises" verticalSpacing="xs">
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Employee</Table.Th>
                        <Table.Th>Date</Table.Th>
                        <Table.Th>Reason</Table.Th>
                        <Table.Th ta="right">Base before → after</Table.Th>
                        <Table.Th ta="right">Raise</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {data.topRaises.map((raise) => (
                        <Table.Tr key={`${raise.employeeCode}-${raise.effectiveDate}`}>
                          <Table.Td>
                            <Anchor
                              component={Link}
                              to={`/employees/${raise.employeeCode}`}
                              state={linkState}
                            >
                              {raise.firstName} {raise.lastName}
                            </Anchor>
                          </Table.Td>
                          <Table.Td>{raise.effectiveDate}</Table.Td>
                          <Table.Td>
                            <Badge variant="light">{reasonLabel(raise.reason)}</Badge>
                          </Table.Td>
                          <Table.Td ta="right">
                            {formatMoney(raise.previousBase, raise.currency)} →{" "}
                            {formatMoney(raise.newBase, raise.currency)}
                          </Table.Td>
                          <Table.Td ta="right" fw={600} c="teal">
                            {pct(raise.raisePct)}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Table.ScrollContainer>
              </Paper>
            </SimpleGrid>
          )}
          <Text size="xs" c="dimmed">
            Period {data.from} to {data.to}
            {!state.from && !state.to && " (the last 12 months)"}.
          </Text>
        </>
      )}
    </Stack>
  );
}
