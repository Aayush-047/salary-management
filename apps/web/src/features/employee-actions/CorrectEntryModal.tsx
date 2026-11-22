import { CorrectCompensationSchema, type CompensationEntryView } from "@salary/shared";
import { Group, Text, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCorrectCompensation } from "../../api/mutations";
import { formatMoney } from "../../lib/money";
import { reasonLabel } from "../employee-detail/format";
import { ActionModal } from "./ActionModal";
import { changedFields } from "./form";
import { MoneyInput } from "./MoneyInput";
import { useActionForm } from "./useActionForm";

type Props = {
  entry: CompensationEntryView | null;
  onClose: () => void;
};

/** Open when an entry is given; fixes a mistake in that pay entry. */
export function CorrectEntryModal({ entry, onClose }: Props) {
  return entry ? <CorrectEntryForm entry={entry} onClose={onClose} /> : null;
}

function CorrectEntryForm({
  entry,
  onClose,
}: {
  entry: CompensationEntryView;
  onClose: () => void;
}) {
  const original = {
    effectiveDate: entry.effectiveDate,
    baseSalary: entry.baseSalary as number | undefined,
    targetBonus: entry.targetBonus as number | undefined,
  };
  const { values, set, errors, validate, fail } = useActionForm({ ...original, note: "" });
  const save = useCorrectCompensation();
  const isHire = entry.reason === "HIRE";

  const submit = () => {
    const { note, ...edited } = values;
    const input = validate(CorrectCompensationSchema, { ...changedFields(original, edited), note });
    if (!input) return;
    save.mutate(
      { id: entry.id, ...input },
      {
        onSuccess: () => {
          notifications.show({ color: "green", message: "Pay entry corrected" });
          onClose();
        },
        onError: fail,
      },
    );
  };

  return (
    <ActionModal
      opened
      title="Correct pay entry"
      submitLabel="Save correction"
      busy={save.isPending}
      errors={errors}
      onClose={onClose}
      onSubmit={submit}
    >
      <Text size="sm" c="dimmed">
        {reasonLabel(entry.reason)} on {entry.effectiveDate}:{" "}
        {formatMoney(entry.baseSalary, entry.currency)} base,{" "}
        {formatMoney(entry.targetBonus, entry.currency)} bonus. The original values stay in the
        change history.
      </Text>
      <TextInput
        type="date"
        label="Effective date"
        description={
          isHire ? "The hire entry follows the hire date; change it on the profile" : undefined
        }
        disabled={isHire}
        value={values.effectiveDate}
        onChange={(e) => set("effectiveDate", e.currentTarget.value)}
        error={errors.effectiveDate}
      />
      <Group grow align="flex-start">
        <MoneyInput
          label="Base salary"
          currency={entry.currency}
          value={values.baseSalary}
          onChange={(v) => set("baseSalary", v)}
          error={errors.baseSalary}
        />
        <MoneyInput
          label="Target bonus"
          currency={entry.currency}
          value={values.targetBonus}
          onChange={(v) => set("targetBonus", v)}
          error={errors.targetBonus}
        />
      </Group>
      <Textarea
        label="What was wrong?"
        placeholder="e.g. Typed 900,000 instead of 90,000"
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
