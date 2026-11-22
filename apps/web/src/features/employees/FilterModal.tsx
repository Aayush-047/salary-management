import type { EmployeeListQuery, MetaResponse } from "@salary/shared";
import { Button, Group, Modal, MultiSelect, SegmentedControl, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { availableJobTitles } from "./filter-chips";
import { DEFAULT_QUERY } from "./url-state";

export type FilterValues = Pick<
  EmployeeListQuery,
  "status" | "country" | "department" | "jobTitle" | "level"
>;

type Props = {
  opened: boolean;
  initial: FilterValues;
  meta: MetaResponse | undefined;
  onClose: () => void;
  onApply: (values: FilterValues) => void;
};

/** Filters are edited as a draft and only applied on "Apply", so the table updates once. */
export function FilterModal({ opened, initial, meta, onClose, onApply }: Props) {
  return (
    <Modal opened={opened} onClose={onClose} title="Filter employees" size="lg" centered>
      {/* Mounted only while open, so each opening starts from the applied filters. */}
      {opened && <FilterForm initial={initial} meta={meta} onCancel={onClose} onApply={onApply} />}
    </Modal>
  );
}

function FilterForm({
  initial,
  meta,
  onCancel,
  onApply,
}: Pick<Props, "initial" | "meta" | "onApply"> & { onCancel: () => void }) {
  const [draft, setDraft] = useState<FilterValues>(initial);
  const departments = meta?.departments ?? [];
  const jobTitles = availableJobTitles(departments, draft.department);

  const setDepartments = (department: string[]) =>
    setDraft((d) => ({
      ...d,
      department,
      // Drop titles that no longer belong to a selected department.
      jobTitle: d.jobTitle?.filter((t) => availableJobTitles(departments, department).includes(t)),
    }));

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb={4}>
          Employment status
        </Text>
        <SegmentedControl
          fullWidth
          aria-label="Employment status"
          value={draft.status}
          onChange={(status) =>
            setDraft((d) => ({ ...d, status: status as FilterValues["status"] }))
          }
          data={[
            { value: "ACTIVE", label: "Active" },
            { value: "TERMINATED", label: "Terminated" },
            { value: "ALL", label: "All" },
          ]}
        />
      </div>
      <MultiSelect
        label="Country"
        placeholder="All countries"
        data={(meta?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
        value={draft.country ?? []}
        onChange={(country) => setDraft((d) => ({ ...d, country }))}
        searchable
        clearable
      />
      <MultiSelect
        label="Department"
        placeholder="All departments"
        data={departments.map((d) => d.name)}
        value={draft.department ?? []}
        onChange={setDepartments}
        searchable
        clearable
      />
      <MultiSelect
        label="Job title"
        placeholder="All job titles"
        data={jobTitles}
        value={draft.jobTitle ?? []}
        onChange={(jobTitle) => setDraft((d) => ({ ...d, jobTitle }))}
        searchable
        clearable
      />
      <MultiSelect
        label="Level"
        placeholder="All levels"
        data={(meta?.levels ?? []).map((l) => ({ value: String(l), label: `L${l}` }))}
        value={(draft.level ?? []).map(String)}
        onChange={(level) => setDraft((d) => ({ ...d, level: level.map(Number) }))}
        clearable
      />
      <Group justify="space-between" mt="sm">
        <Button variant="subtle" onClick={() => setDraft({ status: DEFAULT_QUERY.status })}>
          Reset
        </Button>
        <Group gap="sm">
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onApply(draft)}>Apply</Button>
        </Group>
      </Group>
    </Stack>
  );
}
