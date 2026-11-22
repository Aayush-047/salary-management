import {
  ChangePaySchema,
  PAY_CHANGE_REASONS,
  type EmployeeDetail,
  type MetaResponse,
  type PayChangeReason,
} from "@salary/shared";
import { Group, Select, Text, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useChangePay } from "../../api/mutations";
import { formatChangePct, reasonLabel } from "../employee-detail/format";
import { ActionModal } from "./ActionModal";
import { todayIso } from "./form";
import { MoneyInput } from "./MoneyInput";
import { useActionForm } from "./useActionForm";

type Props = {
  opened: boolean;
  employee: EmployeeDetail;
  meta: MetaResponse | undefined;
  onClose: () => void;
};

export function ChangePayModal(props: Props) {
  return props.opened ? <ChangePayForm {...props} /> : null;
}

function ChangePayForm({ employee, meta, onClose }: Props) {
  const { values, set, errors, validate, fail } = useActionForm({
    effectiveDate: todayIso(),
    reason: "MERIT" as PayChangeReason,
    baseSalary: employee.baseSalary as number | undefined,
    targetBonus: employee.targetBonus as number | undefined,
    newLevel: "",
    newJobTitle: "",
    note: "",
  });
  const save = useChangePay(employee.employeeCode);
  const promotion = values.reason === "PROMOTION";
  const change =
    values.baseSalary !== undefined
      ? formatChangePct((values.baseSalary - employee.baseSalary) / employee.baseSalary)
      : null;

  const submit = () => {
    const input = validate(ChangePaySchema, {
      effectiveDate: values.effectiveDate,
      reason: values.reason,
      baseSalary: values.baseSalary,
      targetBonus: values.targetBonus,
      ...(promotion && values.newLevel && { newLevel: Number(values.newLevel) }),
      ...(promotion &&
        values.newJobTitle &&
        values.newJobTitle !== employee.jobTitle && { newJobTitle: values.newJobTitle }),
      ...(values.note.trim() && { note: values.note }),
    });
    if (!input) return;
    save.mutate(input, {
      onSuccess: () => {
        notifications.show({
          color: "green",
          message: promotion ? "Promotion recorded" : "Pay change recorded",
        });
        onClose();
      },
      onError: fail,
    });
  };

  return (
    <ActionModal
      opened
      title={`Change pay · ${employee.firstName} ${employee.lastName}`}
      submitLabel={promotion ? "Record promotion" : "Record pay change"}
      busy={save.isPending}
      errors={errors}
      onClose={onClose}
      onSubmit={submit}
    >
      <Group grow>
        <Select
          label="Reason"
          data={PAY_CHANGE_REASONS.map((r) => ({ value: r, label: reasonLabel(r) }))}
          value={values.reason}
          onChange={(v) => v && set("reason", v as PayChangeReason)}
          allowDeselect={false}
          error={errors.reason}
        />
        <TextInput
          type="date"
          label="Effective date"
          value={values.effectiveDate}
          onChange={(e) => set("effectiveDate", e.currentTarget.value)}
          error={errors.effectiveDate}
        />
      </Group>
      {promotion && (
        <Group grow>
          <Select
            label="New level"
            placeholder={`Currently L${employee.level}`}
            data={(meta?.levels ?? [])
              .filter((l) => l >= employee.level)
              .map((l) => ({ value: String(l), label: `L${l}` }))}
            value={values.newLevel || null}
            onChange={(v) => set("newLevel", v ?? "")}
            clearable
            error={errors.newLevel}
          />
          <Select
            label="New job title"
            placeholder={employee.jobTitle}
            data={(meta?.departments ?? []).map((d) => ({ group: d.name, items: d.jobTitles }))}
            value={values.newJobTitle || null}
            onChange={(v) => set("newJobTitle", v ?? "")}
            searchable
            clearable
            error={errors.newJobTitle}
          />
        </Group>
      )}
      <Group grow align="flex-start">
        <MoneyInput
          label="New base salary"
          currency={employee.currency}
          value={values.baseSalary}
          onChange={(v) => set("baseSalary", v)}
          error={errors.baseSalary}
          description={
            change && (
              <Text span size="xs">
                {change} vs current
              </Text>
            )
          }
        />
        <MoneyInput
          label="New target bonus"
          currency={employee.currency}
          value={values.targetBonus}
          onChange={(v) => set("targetBonus", v)}
          error={errors.targetBonus}
        />
      </Group>
      <Textarea
        label="Note (optional)"
        placeholder="e.g. Annual review 2026"
        value={values.note}
        onChange={(e) => set("note", e.currentTarget.value)}
        error={errors.note}
        autosize
        minRows={2}
      />
    </ActionModal>
  );
}
