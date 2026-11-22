import type { CompensationEntryView, EmployeeDetail } from "@salary/shared";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Group,
  Paper,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";
import { Link, useLocation, useParams } from "react-router";
import { ApiError } from "../../api/client";
import { useEmployee, useEmployeeAudit, useMeta } from "../../api/queries";
import { ChangePayModal } from "../employee-actions/ChangePayModal";
import { CorrectEntryModal } from "../employee-actions/CorrectEntryModal";
import { EditProfileModal } from "../employee-actions/EditProfileModal";
import { RelocateModal } from "../employee-actions/RelocateModal";
import { TerminateModal } from "../employee-actions/TerminateModal";
import { formatMoney } from "../../lib/money";
import { AuditHistory } from "./AuditHistory";
import { PayTimeline } from "./PayTimeline";

/** The list passes its query string in navigation state, so "Back" restores the filtered view. */
function useBackToList(): string {
  const location = useLocation();
  const from = (location.state as { listSearch?: string } | null)?.listSearch;
  return `/employees${from ?? ""}`;
}

function Stat({ label, value }: { label: string; value: string }) {
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {children}
      </Text>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Paper withBorder radius="md" p="md">
      <Title order={4} mb="sm">
        {title}
      </Title>
      {children}
    </Paper>
  );
}

function Profile({ employee }: { employee: EmployeeDetail }) {
  return (
    <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
      <Field label="Email">{employee.email}</Field>
      <Field label="Country">{employee.country.name}</Field>
      <Field label="Department">{employee.department}</Field>
      <Field label="Job title">{employee.jobTitle}</Field>
      <Field label="Level">L{employee.level}</Field>
      <Field label="Hire date">{employee.hireDate}</Field>
      <Field label="Currency">{employee.currency}</Field>
      {employee.terminationDate && <Field label="Left on">{employee.terminationDate}</Field>}
    </SimpleGrid>
  );
}

export function EmployeeDetailPage() {
  const { code = "" } = useParams();
  const backTo = useBackToList();
  const employee = useEmployee(code);
  // Only ask for the history once the employee is known to exist.
  const audit = useEmployeeAudit(code, { enabled: employee.isSuccess });
  const meta = useMeta();
  const [action, setAction] = useState<"edit" | "pay" | "relocate" | "terminate" | null>(null);
  const [correcting, setCorrecting] = useState<CompensationEntryView | null>(null);
  const closeAction = () => setAction(null);

  const back = (
    <Anchor component={Link} to={backTo} size="sm">
      <Group gap={4}>
        <IconArrowLeft size={14} /> Back to employees
      </Group>
    </Anchor>
  );

  if (employee.isPending) {
    return (
      <Stack gap="md">
        {back}
        <Skeleton height={36} width={320} />
        <SimpleGrid cols={3}>
          <Skeleton height={80} />
          <Skeleton height={80} />
          <Skeleton height={80} />
        </SimpleGrid>
        <Skeleton height={240} />
      </Stack>
    );
  }

  if (employee.isError) {
    const notFound = employee.error instanceof ApiError && employee.error.status === 404;
    return (
      <Stack gap="md">
        {back}
        <Alert
          color={notFound ? "yellow" : "red"}
          title={notFound ? "Employee not found" : "Couldn't load employee"}
        >
          <Text size="sm" mb={notFound ? 0 : "sm"}>
            {employee.error.message}
          </Text>
          {!notFound && (
            <Button size="xs" variant="light" color="red" onClick={() => employee.refetch()}>
              Try again
            </Button>
          )}
        </Alert>
      </Stack>
    );
  }

  const e = employee.data;
  const active = e.status === "ACTIVE";
  return (
    <Stack gap="md">
      {back}
      <Group justify="space-between" align="center" wrap="wrap">
        <Group gap="sm" align="center">
          <Title order={2}>
            {e.firstName} {e.lastName}
          </Title>
          <Badge variant="outline" color="gray">
            {e.employeeCode}
          </Badge>
          {active ? (
            <Badge color="green">Active</Badge>
          ) : (
            <Badge color="gray">Left {e.terminationDate}</Badge>
          )}
        </Group>
        {/* Leavers are read-only; their pay entries can still be corrected below. */}
        {active && (
          <Group gap="xs">
            <Button onClick={() => setAction("pay")}>Change pay</Button>
            <Button variant="default" onClick={() => setAction("edit")}>
              Edit profile
            </Button>
            <Button variant="default" onClick={() => setAction("relocate")}>
              Relocate
            </Button>
            <Button variant="subtle" color="red" onClick={() => setAction("terminate")}>
              Terminate
            </Button>
          </Group>
        )}
      </Group>
      <Text c="dimmed" mt={-8}>
        {e.jobTitle} · L{e.level} · {e.department} · {e.country.name}
      </Text>

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Stat label="Base salary" value={formatMoney(e.baseSalary, e.currency)} />
        <Stat label="Target bonus" value={formatMoney(e.targetBonus, e.currency)} />
        <Stat label="Total cash" value={formatMoney(e.totalCash, e.currency)} />
      </SimpleGrid>

      <Section title="Profile">
        <Profile employee={e} />
      </Section>

      <Section title="Pay history">
        <PayTimeline entries={e.compensation} onCorrect={setCorrecting} />
      </Section>

      <Section title="Change history">
        {audit.isPending ? (
          <Skeleton height={80} />
        ) : audit.isError ? (
          <Text size="sm" c="red">
            Couldn't load the change history: {audit.error.message}
          </Text>
        ) : (
          <AuditHistory items={audit.data.items} />
        )}
      </Section>

      <ChangePayModal
        opened={action === "pay"}
        employee={e}
        meta={meta.data}
        onClose={closeAction}
      />
      <EditProfileModal
        opened={action === "edit"}
        employee={e}
        meta={meta.data}
        onClose={closeAction}
      />
      <RelocateModal
        opened={action === "relocate"}
        employee={e}
        meta={meta.data}
        onClose={closeAction}
      />
      <TerminateModal opened={action === "terminate"} employee={e} onClose={closeAction} />
      <CorrectEntryModal entry={correcting} onClose={() => setCorrecting(null)} />
    </Stack>
  );
}
