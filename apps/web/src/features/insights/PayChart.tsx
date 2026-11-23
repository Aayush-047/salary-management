import type { PayStatsRow } from "@salary/shared";
import { BarChart } from "@mantine/charts";
import { Paper, Text } from "@mantine/core";
import { formatMoney, formatMoneyCompact } from "../../lib/money";

/** What the chart passes to a custom tooltip: one entry per series, carrying the data row. */
type TooltipEntries = ReadonlyArray<{ payload?: unknown }>;

/** Per-bar hover: the median plus the spread and headcount behind it. */
function BarTooltip({ payload }: { payload?: TooltipEntries }) {
  const row = payload?.[0]?.payload as PayStatsRow | undefined;
  if (!row) return null;
  return (
    <Paper withBorder shadow="sm" p="xs" radius="sm">
      <Text fw={600} size="sm">
        {row.label}
      </Text>
      <Text size="sm">Median {formatMoney(row.median, row.currency)}</Text>
      <Text size="xs" c="dimmed">
        Range {formatMoney(row.min, row.currency)} – {formatMoney(row.max, row.currency)}
      </Text>
      <Text size="xs" c="dimmed">
        {row.headcount.toLocaleString("en-US")} employees
      </Text>
    </Paper>
  );
}

const BAR_ROW_HEIGHT = 34;
const AXIS_HEIGHT = 40;

/**
 * Ranked horizontal bars of the median per group: one series, one hue, names on the axis
 * (long titles never squeezed into short bars), solid recessive grid, hover for details.
 */
export function PayChart({ rows, currency }: { rows: PayStatsRow[]; currency: string }) {
  return (
    <BarChart
      h={rows.length * BAR_ROW_HEIGHT + AXIS_HEIGHT}
      data={rows}
      dataKey="label"
      orientation="vertical"
      series={[{ name: "median", label: "Median", color: "blue.6" }]}
      valueFormatter={(value) => formatMoneyCompact(value, currency)}
      gridAxis="y"
      strokeDasharray="0"
      withLegend={false}
      maxBarWidth={22}
      barProps={{ radius: [0, 4, 4, 0] }}
      yAxisProps={{ width: 200 }}
      tooltipProps={{
        content: ({ payload }) => <BarTooltip payload={payload} />,
      }}
      aria-label={`Median pay by group in ${currency}`}
    />
  );
}
