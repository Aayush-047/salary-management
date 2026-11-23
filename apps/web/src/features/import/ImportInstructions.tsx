import { IMPORT_COLUMNS, MAX_IMPORT_ROWS, importTemplateCsv } from "@salary/shared";
import { Accordion, Button, Code, Group, List, Paper, Table, Text, Title } from "@mantine/core";
import { IconDownload } from "@tabler/icons-react";
import { useMeta } from "../../api/queries";

/** Offers the template as a file; the browser saves it with the given name. */
function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([importTemplateCsv()], { type: "text/csv" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "employee-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** How to prepare a file, generated from the same column definitions the server checks. */
export function ImportInstructions() {
  const meta = useMeta().data;

  return (
    <Paper withBorder radius="md" p="md">
      <Group justify="space-between" align="flex-start" wrap="wrap" mb="sm">
        <Title order={4}>How it works</Title>
        <Button variant="light" leftSection={<IconDownload size={16} />} onClick={downloadTemplate}>
          Download template
        </Button>
      </Group>
      <List type="ordered" spacing={4} size="sm" mb="md">
        <List.Item>
          Download the template, or save your spreadsheet as CSV with the column names below. One
          row per new employee.
        </List.Item>
        <List.Item>Choose the file. Every row is checked first; nothing is saved yet.</List.Item>
        <List.Item>
          Fix any problems in your spreadsheet and choose the file again, then click Import.
        </List.Item>
      </List>

      <Title order={5} mb={4}>
        Rules
      </Title>
      <List spacing={4} size="sm" mb="md">
        <List.Item>
          <b>All or nothing:</b> if any row has a problem, nothing is imported.
        </List.Item>
        <List.Item>
          <b>New people only:</b> rows whose email is already in the system are rejected. Change
          existing employees from their own page, where every change is recorded.
        </List.Item>
        <List.Item>
          <b>Pay</b> is per year, in the country's own currency, as a whole number:{" "}
          <Code>78000</Code> or <Code>78,000</Code>. Dots aren't accepted, because{" "}
          <Code>78.000</Code> means 78 in some countries and 78 thousand in others.
        </List.Item>
        <List.Item>
          <b>Dates</b> as <Code>YYYY-MM-DD</Code>; hire dates can't be in the future.
        </List.Item>
        <List.Item>
          Up to {MAX_IMPORT_ROWS.toLocaleString("en-US")} rows or 5 MB per file. Each imported
          employee gets a hire pay entry and a change-history entry naming the file.
        </List.Item>
      </List>

      <Accordion variant="contained" chevronPosition="left">
        <Accordion.Item value="columns">
          <Accordion.Control>Columns ({IMPORT_COLUMNS.length}, in any order)</Accordion.Control>
          <Accordion.Panel>
            <Table.ScrollContainer minWidth={560}>
              <Table verticalSpacing={6} fz="sm" aria-label="Import columns">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Column</Table.Th>
                    <Table.Th>Example</Table.Th>
                    <Table.Th>Notes</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {IMPORT_COLUMNS.map((column) => (
                    <Table.Tr key={column.name}>
                      <Table.Td>
                        <Code>{column.name}</Code>
                      </Table.Td>
                      <Table.Td>{column.example}</Table.Td>
                      <Table.Td>{column.help}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="values">
          <Accordion.Control>Valid countries and job titles</Accordion.Control>
          <Accordion.Panel>
            <Text size="sm" mb={6}>
              <b>Countries:</b>{" "}
              {(meta?.countries ?? [])
                .map((c) => `${c.code} (${c.name}, ${c.currency})`)
                .join(" · ")}
            </Text>
            <Text size="sm">
              <b>Job titles:</b>{" "}
              {(meta?.departments ?? [])
                .flatMap((d) => d.jobTitles)
                .sort()
                .join(" · ")}
            </Text>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Paper>
  );
}
