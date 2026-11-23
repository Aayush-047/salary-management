import {
  LOCAL_CURRENCY,
  PAY_STATS_GROUPS,
  type PayStatsGroup,
  type PayStatsRow,
} from "@salary/shared";
import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconFilter } from "@tabler/icons-react";
import { useSearchParams } from "react-router";
import { useMeta, usePayStats } from "../../api/queries";
import { useDisplayCurrency } from "../../components/display-currency-context";
import { formatMoney, formatMoneyCompact } from "../../lib/money";
import { latestSearchParams } from "../../lib/search-params";
import { FilterModal, type FilterValues } from "../employees/FilterModal";
import { activeFilterCount } from "../employees/filters";
import { filterChange } from "../employees/url-state";
import {
  explorerParams,
  orderLike,
  parseExplorer,
  toChartRows,
  type ExplorerState,
} from "./explorer-state";
import { PayChart } from "./PayChart";

const GROUP_LABELS: Record<PayStatsGroup, string> = {
  country: "Country",
  department: "Department",
  jobTitle: "Job title",
  level: "Level",
};

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="xl" fw={700} mt={4}>
        {value}
      </Text>
      {hint && (
        <Text size="xs" c="dimmed">
          {hint}
        </Text>
      )}
    </Paper>
  );
}

function StatsTable({ rows, groupBy }: { rows: PayStatsRow[]; groupBy: PayStatsGroup }) {
  const money = (row: PayStatsRow, amount: number) => formatMoney(amount, row.currency);
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table striped verticalSpacing="xs" aria-label="Pay statistics">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>{GROUP_LABELS[groupBy]}</Table.Th>
            <Table.Th ta="right">Headcount</Table.Th>
            <Table.Th ta="right">Min</Table.Th>
            <Table.Th ta="right">Median</Table.Th>
            <Table.Th ta="right">Average</Table.Th>
            <Table.Th ta="right">Max</Table.Th>
            <Table.Th ta="right">Total payroll</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.map((row) => (
            <Table.Tr key={row.key}>
              <Table.Td fw={500}>{row.label}</Table.Td>
              <Table.Td ta="right">{row.headcount.toLocaleString("en-US")}</Table.Td>
              <Table.Td ta="right">{money(row, row.min)}</Table.Td>
              <Table.Td ta="right" fw={600}>
                {money(row, row.median)}
              </Table.Td>
              <Table.Td ta="right">{money(row, row.average)}</Table.Td>
              <Table.Td ta="right">{money(row, row.max)}</Table.Td>
              <Table.Td ta="right">{formatMoneyCompact(row.total, row.currency)}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/** Pay explorer: how the organisation pays, broken down one way at a time. */
export function ExplorerTab() {
  const [params, setParams] = useSearchParams();
  const state = parseExplorer(params);
  const meta = useMeta();
  const [filtersOpened, filters] = useDisclosure(false);
  const { currency } = useDisplayCurrency();

  // The table can show each country in its own currency; a chart's single axis cannot.
  const chartCurrency = currency === LOCAL_CURRENCY ? "USD" : currency;
  const table = usePayStats({ ...state, currency });
  const chart = usePayStats({ ...state, currency: chartCurrency });

  const update = (change: Partial<ExplorerState>) => {
    const latest = latestSearchParams();
    setParams(explorerParams({ ...parseExplorer(latest), ...change }, latest));
  };
  const applyFilters = (values: FilterValues) => {
    update(filterChange(values));
    filters.close();
  };

  const overall = chart.data?.overall;
  const metricLabel = state.metric === "total" ? "total cash" : "base salary";
  const filterCount = activeFilterCount(state);
  const mixedLocal = currency === LOCAL_CURRENCY && state.groupBy === "country";

  return (
    <Stack gap="md">
      <Group gap="sm" wrap="wrap">
        <SegmentedControl
          aria-label="Group by"
          value={state.groupBy}
          onChange={(groupBy) => update({ groupBy: groupBy as PayStatsGroup })}
          data={PAY_STATS_GROUPS.map((g) => ({ value: g, label: GROUP_LABELS[g] }))}
        />
        <SegmentedControl
          aria-label="Pay measure"
          value={state.metric}
          onChange={(metric) => update({ metric: metric as ExplorerState["metric"] })}
          data={[
            { value: "total", label: "Total cash" },
            { value: "base", label: "Base salary" },
          ]}
        />
        <Button
          variant="default"
          leftSection={<IconFilter size={16} />}
          rightSection={
            filterCount > 0 ? (
              <Badge size="sm" circle aria-label={`${filterCount} filters applied`}>
                {filterCount}
              </Badge>
            ) : null
          }
          onClick={filters.open}
        >
          Filters
        </Button>
      </Group>

      {chart.isError ? (
        <Alert color="red" title="Couldn't load pay statistics">
          {chart.error.message}
        </Alert>
      ) : chart.isPending ? (
        <Skeleton height={320} />
      ) : !overall ? (
        <Text c="dimmed">No employees match these filters.</Text>
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <Kpi label="Employees" value={overall.headcount.toLocaleString("en-US")} />
            <Kpi
              label={`Median ${metricLabel}`}
              value={formatMoney(overall.median, overall.currency)}
            />
            <Kpi
              label={`Average ${metricLabel}`}
              value={formatMoney(overall.average, overall.currency)}
            />
            <Kpi
              label="Total payroll"
              value={formatMoneyCompact(overall.total, overall.currency)}
              hint={`${metricLabel}, per year`}
            />
          </SimpleGrid>

          <Paper
            withBorder
            radius="md"
            p="md"
            style={{ opacity: chart.isPlaceholderData ? 0.6 : 1 }}
          >
            <Title order={4}>
              Median {metricLabel} by {GROUP_LABELS[state.groupBy].toLowerCase()}
            </Title>
            <Text size="xs" c="dimmed" mb="sm">
              In {chartCurrency} at the static rates as of {chart.data.fxAsOf} · hover a bar for the
              range and headcount
            </Text>
            {chart.data.rows.length > 1 ? (
              <PayChart
                rows={toChartRows(chart.data.rows, state.groupBy)}
                currency={chartCurrency}
              />
            ) : (
              <Text size="sm" c="dimmed">
                Only one group matches; see the figures above and in the table below.
              </Text>
            )}
          </Paper>

          <Paper
            withBorder
            radius="md"
            p="md"
            style={{ opacity: table.isPlaceholderData ? 0.6 : 1 }}
          >
            <Group justify="space-between" mb="sm">
              <Title order={4}>Details</Title>
              <Text size="xs" c="dimmed">
                {mixedLocal
                  ? "Each country in its own currency"
                  : `In ${table.data?.rows[0]?.currency ?? chartCurrency}`}
              </Text>
            </Group>
            {table.data && (
              <StatsTable
                rows={orderLike(table.data.rows, toChartRows(chart.data.rows, state.groupBy))}
                groupBy={state.groupBy}
              />
            )}
          </Paper>
        </>
      )}

      <FilterModal
        opened={filtersOpened}
        initial={{
          status: state.status,
          country: state.country,
          department: state.department,
          jobTitle: state.jobTitle,
          level: state.level,
        }}
        meta={meta.data}
        onClose={filters.close}
        onApply={applyFilters}
      />
    </Stack>
  );
}
