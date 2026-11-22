import { RelocateSchema, type EmployeeDetail, type MetaResponse } from "@salary/shared";
import { Group, Select, Text, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useRelocate } from "../../api/mutations";
import { convertAmount } from "../../lib/fx";
import { formatMoney } from "../../lib/money";
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

export function RelocateModal(props: Props) {
  return props.opened ? <RelocateForm {...props} /> : null;
}

function RelocateForm({ employee, meta, onClose }: Props) {
  const { values, set, errors, validate, fail } = useActionForm({
    countryCode: "",
    effectiveDate: todayIso(),
    baseSalary: undefined as number | undefined,
    targetBonus: undefined as number | undefined,
    note: "",
  });
  const save = useRelocate(employee.employeeCode);
  const target = meta?.countries.find((c) => c.code === values.countryCode);
  const newCurrency = target?.currency ?? "—";

  // Current pay at the static rate, as a starting point (not a recommendation).
  const converted =
    target && meta
      ? convertAmount(employee.baseSalary, employee.currency, target.currency, meta.fx.ratesToUsd)
      : null;

  const submit = () => {
    const input = validate(RelocateSchema, values);
    if (!input) return;
    save.mutate(input, {
      onSuccess: (detail) => {
        notifications.show({ color: "green", message: `Relocated to ${detail.country.name}` });
        onClose();
      },
      onError: fail,
    });
  };

  return (
    <ActionModal
      opened
      title={`Relocate · ${employee.firstName} ${employee.lastName}`}
      submitLabel="Relocate"
      busy={save.isPending}
      errors={errors}
      onClose={onClose}
      onSubmit={submit}
    >
      <Text size="sm" c="dimmed">
        Currently in {employee.country.name} on{" "}
        {formatMoney(employee.baseSalary, employee.currency)} base. Pay after the move is entered in
        the new country's currency.
      </Text>
      <Group grow>
        <Select
          label="New country"
          placeholder="Choose a country"
          data={(meta?.countries ?? [])
            .filter((c) => c.code !== employee.country.code)
            .map((c) => ({ value: c.code, label: `${c.name} (${c.currency})` }))}
          value={values.countryCode || null}
          onChange={(v) => set("countryCode", v ?? "")}
          searchable
          error={errors.countryCode}
        />
        <TextInput
          type="date"
          label="Effective date"
          value={values.effectiveDate}
          onChange={(e) => set("effectiveDate", e.currentTarget.value)}
          error={errors.effectiveDate}
        />
      </Group>
      <Group grow align="flex-start">
        <MoneyInput
          label="New base salary"
          currency={newCurrency}
          value={values.baseSalary}
          onChange={(v) => set("baseSalary", v)}
          error={errors.baseSalary}
          description={
            converted !== null &&
            target && (
              <Text span size="xs">
                Current base ≈ {formatMoney(Math.round(converted / 100) * 100, target.currency)} at
                the {meta?.fx.asOf} rate
              </Text>
            )
          }
        />
        <MoneyInput
          label="New target bonus"
          currency={newCurrency}
          value={values.targetBonus}
          onChange={(v) => set("targetBonus", v)}
          error={errors.targetBonus}
        />
      </Group>
      <Textarea
        label="Reason"
        placeholder="e.g. Moved to the London office"
        required
        value={values.note}
        onChange={(e) => set("note", e.currentTarget.value)}
        error={errors.note}
        autosize
        minRows={2}
      />
    </ActionModal>
  );
}
