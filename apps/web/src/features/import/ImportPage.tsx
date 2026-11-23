import type { ImportCheckResponse, ImportResponse } from "@salary/shared";
import {
  Alert,
  Badge,
  Button,
  FileInput,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileTypeCsv } from "@tabler/icons-react";
import { useState } from "react";
import { Link } from "react-router";
import { useCheckImport, useImportEmployees } from "../../api/mutations";
import { countriesSummary, employeesLabel, fileTooLarge } from "./import-format";
import { ImportInstructions } from "./ImportInstructions";

type Upload = { filename: string; text: string };

function ProblemsTable({ report }: { report: ImportCheckResponse }) {
  const hidden = report.errorCount - report.errors.length;
  return (
    <>
      <Table.ScrollContainer minWidth={560}>
        <Table striped verticalSpacing={6} fz="sm" aria-label="Import problems">
          <Table.Thead>
            <Table.Tr>
              <Table.Th w={80}>Row</Table.Th>
              <Table.Th w={140}>Column</Table.Th>
              <Table.Th>Problem</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {report.errors.map((issue, index) => (
              <Table.Tr key={index}>
                <Table.Td>{issue.row ?? "File"}</Table.Td>
                <Table.Td>{issue.column ?? "—"}</Table.Td>
                <Table.Td>{issue.message}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
      {hidden > 0 && (
        <Text size="sm" c="dimmed" mt="xs">
          …and {hidden.toLocaleString("en-US")} more. Fix these and check again to see the rest.
        </Text>
      )}
    </>
  );
}

/** Upload a CSV, see every problem or a summary, then import all rows at once. */
export function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<Upload | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [imported, setImported] = useState<ImportResponse | null>(null);
  const check = useCheckImport();
  const importer = useImportEmployees();

  const choose = async (next: File | null) => {
    setFile(next);
    setUpload(null);
    setFileError(null);
    setImported(null);
    check.reset();
    importer.reset();
    if (!next) return;
    if (fileTooLarge(next.size)) {
      setFileError("The file is larger than 5 MB. Split it into smaller files.");
      return;
    }
    const chosen = { filename: next.name, text: await next.text() };
    setUpload(chosen);
    check.mutate(chosen);
  };

  const runImport = () => {
    if (!upload) return;
    importer.mutate(upload, {
      onSuccess: (result) => {
        setImported(result);
        notifications.show({
          color: "green",
          message: `Imported ${employeesLabel(result.imported)}`,
        });
      },
    });
  };

  const report = check.data;
  // The import re-checks the file; if something changed meanwhile, show its report instead.
  const importReport = (importer.error as { details?: ImportCheckResponse } | null)?.details;
  const shownReport = importReport ?? report;

  return (
    <Stack gap="md">
      <div>
        <Title order={2}>Import employees</Title>
        <Text c="dimmed" size="sm">
          Add many new employees at once from a spreadsheet.
        </Text>
      </div>

      <ImportInstructions />

      <Paper withBorder radius="md" p="md">
        <FileInput
          label="CSV file"
          placeholder="Choose a .csv file"
          accept=".csv,text/csv"
          leftSection={<IconFileTypeCsv size={18} />}
          value={file}
          onChange={choose}
          clearable
          error={fileError}
          maw={420}
        />

        {check.isPending && (
          <Group gap="xs" mt="md">
            <Loader size="xs" />
            <Text size="sm">Checking every row…</Text>
          </Group>
        )}

        {check.isError && !importReport && (
          <Alert color="red" mt="md" title="Couldn't check the file">
            {check.error.message}
          </Alert>
        )}

        {imported ? (
          <Alert color="green" mt="md" title={`Imported ${employeesLabel(imported.imported)}`}>
            <Text size="sm" mb="sm">
              New employee codes {imported.firstCode} to {imported.lastCode}. Each has a hire pay
              entry and a change-history entry naming the file.
            </Text>
            <Button
              component={Link}
              to="/employees?sortBy=employeeCode&sortDir=desc"
              variant="light"
              color="green"
              size="xs"
            >
              View the new employees
            </Button>
          </Alert>
        ) : shownReport && !shownReport.valid ? (
          <Stack gap="sm" mt="md">
            <Alert color="red" title={`${shownReport.filename}: nothing will be imported yet`}>
              Found {shownReport.errorCount.toLocaleString("en-US")}{" "}
              {shownReport.errorCount === 1 ? "problem" : "problems"} in{" "}
              {shownReport.rows.toLocaleString("en-US")} rows. Fix them in your spreadsheet and
              choose the file again.
            </Alert>
            <ProblemsTable report={shownReport} />
          </Stack>
        ) : report?.valid ? (
          <Alert color="blue" mt="md" title={`${report.filename} is ready to import`}>
            <Text size="sm" mb="xs">
              {employeesLabel(report.rows)}: {countriesSummary(report.byCountry)}. No problems
              found.
            </Text>
            <Group gap={6} mb="sm">
              {report.byCountry.map((c) => (
                <Badge key={c.code} variant="light">
                  {c.code} · {c.count.toLocaleString("en-US")}
                </Badge>
              ))}
            </Group>
            <Button onClick={runImport} loading={importer.isPending}>
              Import {employeesLabel(report.rows)}
            </Button>
          </Alert>
        ) : null}

        {importer.isError && !importReport && (
          <Alert color="red" mt="md" title="Import failed; nothing was saved">
            {importer.error.message}
          </Alert>
        )}
      </Paper>
    </Stack>
  );
}
