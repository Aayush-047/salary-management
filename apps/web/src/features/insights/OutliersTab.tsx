import type { OutlierItem, OutlierQuery } from "@salary/shared";
import {
  Alert,
  Anchor,
  Badge,
  Group,
  NumberInput,
  Pagination,
  Paper,
  RangeSlider,
  SegmentedControl,
  SimpleGrid,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router";
import { useOutliers } from "../../api/queries";
import { useMoney } from "../../components/display-currency-context";
import { backLinkState } from "../../lib/back-link";
import { latestSearchParams } from "../../lib/search-params";
import { InsightFilters } from "./InsightFilters";
import {
  BAND_MAX,
  BAND_MIN,
  BAND_STEP,
  DEFAULT_OUTLIERS,
  clampBand,
  parseOutliers,
  stateParams,
} from "./tab-state";

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Text size="xs" c="dimmed" tt="uppercase" fw={600}>
        {label}
      </Text>
      <Text size="xl" fw={700} mt={4}>
        {value}
      </Text>
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
    </Paper>
  );
}

function OutlierRow({ item, linkState }: { item: OutlierItem; linkState: object }) {
  const money = useMoney();
  const pay = money(item.pay, item.currency);
  const median = money(item.peerMedian, item.currency);
  return (
    <Table.Tr>
      <Table.Td>
        <Anchor component={Link} to={`/employees/${item.employeeCode}`} state={linkState} fw={500}>
          {item.firstName} {item.lastName}
        </Anchor>
        <Text size="xs" c="dimmed">
          {item.employeeCode}
        </Text>
      </Table.Td>
      <Table.Td>
        {item.jobTitle} · L{item.level} · {item.countryCode}
      </Table.Td>
      <Table.Td ta="right">{pay.text}</Table.Td>
      <Table.Td ta="right">{median.text}</Table.Td>
      <Table.Td ta="right">
        <Group gap={6} justify="flex-end" wrap="nowrap">
          <Text fw={600} size="sm">
            {item.compaRatio.toFixed(2)}
          </Text>
          <Badge variant="light" color={item.direction === "under" ? "orange" : "grape"}>
            {item.direction === "under" ? "↓ Below peers" : "↑ Above peers"}
          </Badge>
        </Group>
      </Table.Td>
      <Table.Td ta="right">{item.peerCount}</Table.Td>
    </Table.Tr>
  );
}

/** Peer outliers: who is paid far from others with the same title, level and country. */
export function OutliersTab() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const state = parseOutliers(params);
  const outliers = useOutliers(state);
  // Local slider value while dragging; the URL (and the request) update when released.
  const [band, setBand] = useState<[number, number] | null>(null);
  const shownBand = band ?? [state.low, state.high];

  const update = (change: Partial<OutlierQuery>) => {
    const latest = latestSearchParams();
    const next = {
      ...parseOutliers(latest),
      ...change,
      page: "page" in change ? (change.page ?? 1) : 1,
    };
    setParams(stateParams(next, DEFAULT_OUTLIERS, latest));
  };
  const linkState = backLinkState(`${location.pathname}${location.search}`, "Back to outliers");
  const data = outliers.data;

  return (
    <Stack gap="md">
      <Paper withBorder radius="md" p="md">
        <Group align="flex-end" gap="xl" wrap="wrap">
          <div style={{ flex: "1 1 320px", maxWidth: 480 }}>
            <Text size="sm" fw={500}>
              Flag pay below {shownBand[0].toFixed(2)}× or above {shownBand[1].toFixed(2)}× the peer
              median
            </Text>
            <RangeSlider
              aria-label="Outlier band"
              mt="xs"
              mb="lg"
              min={BAND_MIN}
              max={BAND_MAX}
              step={BAND_STEP}
              minRange={0.1}
              value={shownBand}
              onChange={(value) => setBand(clampBand(value))}
              onChangeEnd={(value) => {
                const [low, high] = clampBand(value);
                setBand(null);
                update({ low, high });
              }}
              label={(value) => `${value.toFixed(2)}×`}
              marks={[
                { value: 0.8, label: "0.8" },
                { value: 1, label: "1.0" },
                { value: 1.2, label: "1.2" },
              ]}
            />
          </div>
          <NumberInput
            label="Smallest peer group"
            description="Smaller groups aren't judged"
            min={2}
            max={100}
            w={170}
            value={state.minPeers}
            onChange={(value) =>
              typeof value === "number" && value >= 2 && update({ minPeers: value })
            }
          />
          <SegmentedControl
            aria-label="Pay measure"
            value={state.metric}
            onChange={(metric) => update({ metric: metric as OutlierQuery["metric"] })}
            data={[
              { value: "base", label: "Base salary" },
              { value: "total", label: "Total cash" },
            ]}
          />
          <SegmentedControl
            aria-label="Direction"
            value={state.direction}
            onChange={(direction) => update({ direction: direction as OutlierQuery["direction"] })}
            data={[
              { value: "both", label: "Both" },
              { value: "under", label: "Below peers" },
              { value: "over", label: "Above peers" },
            ]}
          />
          <InsightFilters filters={state} onApply={update} />
        </Group>
      </Paper>

      {outliers.isError ? (
        <Alert color="red" title="Couldn't load outliers">
          {outliers.error.message}
        </Alert>
      ) : !data ? (
        <Skeleton height={300} />
      ) : (
        <>
          <SimpleGrid cols={{ base: 2, md: 4 }}>
            <Tile
              label="Below peers"
              value={data.summary.underpaid.toLocaleString("en-US")}
              hint={`paid under ${state.low.toFixed(2)}× their peer median`}
            />
            <Tile
              label="Above peers"
              value={data.summary.overpaid.toLocaleString("en-US")}
              hint={`paid over ${state.high.toFixed(2)}× their peer median`}
            />
            <Tile
              label="Employees compared"
              value={data.summary.employeesAnalysed.toLocaleString("en-US")}
              hint={`in ${data.summary.peerGroups.toLocaleString("en-US")} peer groups`}
            />
            <Tile
              label="Not compared"
              value={data.summary.employeesNotAnalysed.toLocaleString("en-US")}
              hint={`in ${data.summary.smallPeerGroups} groups under ${state.minPeers} people`}
            />
          </SimpleGrid>

          <Paper withBorder radius="md" style={{ opacity: outliers.isPlaceholderData ? 0.6 : 1 }}>
            {data.items.length === 0 ? (
              <Text c="dimmed" p="xl" ta="center">
                No one is paid outside this band. Widen the band or lower the smallest group size to
                look further.
              </Text>
            ) : (
              <Table.ScrollContainer minWidth={900}>
                <Table verticalSpacing="xs" striped aria-label="Pay outliers">
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Employee</Table.Th>
                      <Table.Th>Peer group</Table.Th>
                      <Table.Th ta="right">Pay</Table.Th>
                      <Table.Th ta="right">Peer median</Table.Th>
                      <Table.Th ta="right">Compa-ratio</Table.Th>
                      <Table.Th ta="right">Peers</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {data.items.map((item) => (
                      <OutlierRow key={item.employeeCode} item={item} linkState={linkState} />
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
          </Paper>

          {data.totalPages > 1 && (
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                {data.total.toLocaleString("en-US")} employees, furthest from their peers first
              </Text>
              <Pagination
                total={data.totalPages}
                value={data.page}
                onChange={(page) => update({ page })}
                size="sm"
              />
            </Group>
          )}
        </>
      )}
    </Stack>
  );
}
