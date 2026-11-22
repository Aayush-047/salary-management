import type { CompensationEntryView } from "@salary/shared";
import { Badge, Button, Table, Text } from "@mantine/core";
import { formatMoney } from "../../lib/money";
import { formatChangePct, reasonLabel } from "./format";

const REASON_COLORS: Record<CompensationEntryView["reason"], string> = {
  HIRE: "gray",
  MERIT: "blue",
  PROMOTION: "grape",
  MARKET_ADJUSTMENT: "teal",
  RELOCATION: "orange",
  OTHER: "gray",
};

function Change({ entry }: { entry: CompensationEntryView }) {
  const text = formatChangePct(entry.baseChangePct);
  if (text === null) {
    return (
      <Text size="sm" c="dimmed">
        {entry.reason === "RELOCATION" ? "New currency" : "—"}
      </Text>
    );
  }
  const color =
    (entry.baseChangePct ?? 0) > 0 ? "teal" : (entry.baseChangePct ?? 0) < 0 ? "red" : "dimmed";
  return (
    <Text size="sm" c={color} fw={500}>
      {text}
    </Text>
  );
}

/** Pay history, newest first. */
export function PayTimeline({
  entries,
  onCorrect,
}: {
  entries: CompensationEntryView[];
  onCorrect: (entry: CompensationEntryView) => void;
}) {
  return (
    <Table.ScrollContainer minWidth={760}>
      <Table verticalSpacing="sm" aria-label="Pay history">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Effective</Table.Th>
            <Table.Th>Reason</Table.Th>
            <Table.Th ta="right">Base</Table.Th>
            <Table.Th ta="right">Change</Table.Th>
            <Table.Th ta="right">Target bonus</Table.Th>
            <Table.Th ta="right">Total cash</Table.Th>
            <Table.Th>Note</Table.Th>
            <Table.Th />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {entries.map((entry) => (
            <Table.Tr key={entry.id}>
              <Table.Td>{entry.effectiveDate}</Table.Td>
              <Table.Td>
                <Badge variant="light" color={REASON_COLORS[entry.reason]}>
                  {reasonLabel(entry.reason)}
                </Badge>
              </Table.Td>
              <Table.Td ta="right">{formatMoney(entry.baseSalary, entry.currency)}</Table.Td>
              <Table.Td ta="right">
                <Change entry={entry} />
              </Table.Td>
              <Table.Td ta="right">{formatMoney(entry.targetBonus, entry.currency)}</Table.Td>
              <Table.Td ta="right">{formatMoney(entry.totalCash, entry.currency)}</Table.Td>
              <Table.Td>
                <Text size="sm" c={entry.note ? undefined : "dimmed"}>
                  {entry.note ?? "—"}
                </Text>
              </Table.Td>
              <Table.Td ta="right">
                <Button
                  size="compact-xs"
                  variant="subtle"
                  onClick={() => onCorrect(entry)}
                  aria-label={`Correct the ${entry.effectiveDate} entry`}
                >
                  Correct
                </Button>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}
