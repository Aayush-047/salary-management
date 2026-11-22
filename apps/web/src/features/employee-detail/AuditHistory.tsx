import type { AuditEntryView } from "@salary/shared";
import { Group, Paper, Stack, Table, Text } from "@mantine/core";
import { auditHeadline, fieldLabel, formatAuditValue } from "./format";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function AuditItem({ entry }: { entry: AuditEntryView }) {
  return (
    <Paper withBorder radius="md" p="sm">
      <Group justify="space-between" mb={6} wrap="wrap">
        <Text fw={600} size="sm">
          {auditHeadline(entry)}
        </Text>
        <Text size="xs" c="dimmed">
          {dateTime.format(new Date(entry.createdAt))} UTC · {entry.actor.name}
        </Text>
      </Group>
      {entry.reason && (
        <Text size="sm" mb={6}>
          “{entry.reason}”
        </Text>
      )}
      <Table withRowBorders={false} verticalSpacing={2} fz="sm">
        <Table.Tbody>
          {entry.changes.map((change) => (
            <Table.Tr key={change.field}>
              <Table.Td w={160} c="dimmed">
                {fieldLabel(change.field)}
              </Table.Td>
              <Table.Td>
                {change.from !== null && (
                  <>
                    <Text span td="line-through" c="dimmed" size="sm">
                      {formatAuditValue(change.field, change.from)}
                    </Text>{" "}
                    →{" "}
                  </>
                )}
                <Text span fw={500} size="sm">
                  {formatAuditValue(change.field, change.to)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
}

/** Who changed what, when and why; newest first. */
export function AuditHistory({ items }: { items: AuditEntryView[] }) {
  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No changes recorded yet. Records imported before go-live have no history here.
      </Text>
    );
  }
  return (
    <Stack gap="sm">
      {items.map((entry) => (
        <AuditItem key={entry.id} entry={entry} />
      ))}
    </Stack>
  );
}
