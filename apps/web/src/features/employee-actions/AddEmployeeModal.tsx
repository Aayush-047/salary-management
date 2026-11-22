import { CreateEmployeeSchema, type MetaResponse } from "@salary/shared";
import { Group, Select, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useNavigate } from "react-router";
import { useCreateEmployee } from "../../api/mutations";
import { ActionModal } from "./ActionModal";
import { todayIso } from "./form";
import { MoneyInput } from "./MoneyInput";
import { useActionForm } from "./useActionForm";

type Props = {
  opened: boolean;
  meta: MetaResponse | undefined;
  onClose: () => void;
};

export function AddEmployeeModal(props: Props) {
  return props.opened ? <AddEmployeeForm {...props} /> : null;
}

function AddEmployeeForm({ meta, onClose }: Props) {
  const navigate = useNavigate();
  const { values, set, errors, validate, fail } = useActionForm({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "",
    jobTitle: "",
    level: "",
    hireDate: todayIso(),
    baseSalary: undefined as number | undefined,
    targetBonus: undefined as number | undefined,
    note: "",
  });
  const save = useCreateEmployee();
  const currency = meta?.countries.find((c) => c.code === values.countryCode)?.currency ?? "—";

  const submit = () => {
    const input = validate(CreateEmployeeSchema, {
      ...values,
      level: values.level ? Number(values.level) : undefined,
      note: values.note.trim() || undefined,
    });
    if (!input) return;
    save.mutate(input, {
      onSuccess: (detail) => {
        notifications.show({
          color: "green",
          message: `${detail.firstName} ${detail.lastName} added as ${detail.employeeCode}`,
        });
        onClose();
        navigate(`/employees/${detail.employeeCode}`);
      },
      onError: fail,
    });
  };

  return (
    <ActionModal
      opened
      title="Add employee"
      submitLabel="Add employee"
      busy={save.isPending}
      errors={errors}
      onClose={onClose}
      onSubmit={submit}
    >
      <Group grow>
        <TextInput
          label="First name"
          required
          value={values.firstName}
          onChange={(e) => set("firstName", e.currentTarget.value)}
          error={errors.firstName}
        />
        <TextInput
          label="Last name"
          required
          value={values.lastName}
          onChange={(e) => set("lastName", e.currentTarget.value)}
          error={errors.lastName}
        />
      </Group>
      <TextInput
        label="Email"
        required
        value={values.email}
        onChange={(e) => set("email", e.currentTarget.value)}
        error={errors.email}
      />
      <Group grow>
        <Select
          label="Country"
          required
          placeholder="Choose a country"
          data={(meta?.countries ?? []).map((c) => ({ value: c.code, label: c.name }))}
          value={values.countryCode || null}
          onChange={(v) => set("countryCode", v ?? "")}
          searchable
          error={errors.countryCode}
        />
        <TextInput
          type="date"
          label="Hire date"
          required
          value={values.hireDate}
          onChange={(e) => set("hireDate", e.currentTarget.value)}
          error={errors.hireDate}
        />
      </Group>
      <Group grow>
        <Select
          label="Job title"
          required
          placeholder="Choose a title"
          data={(meta?.departments ?? []).map((d) => ({ group: d.name, items: d.jobTitles }))}
          value={values.jobTitle || null}
          onChange={(v) => set("jobTitle", v ?? "")}
          searchable
          error={errors.jobTitle}
        />
        <Select
          label="Level"
          required
          placeholder="Choose a level"
          data={(meta?.levels ?? []).map((l) => ({ value: String(l), label: `L${l}` }))}
          value={values.level || null}
          onChange={(v) => set("level", v ?? "")}
          error={errors.level}
        />
      </Group>
      <Group grow align="flex-start">
        <MoneyInput
          label="Base salary"
          required
          currency={currency}
          value={values.baseSalary}
          onChange={(v) => set("baseSalary", v)}
          error={errors.baseSalary}
        />
        <MoneyInput
          label="Target bonus"
          required
          currency={currency}
          value={values.targetBonus}
          onChange={(v) => set("targetBonus", v)}
          error={errors.targetBonus}
        />
      </Group>
      <Textarea
        label="Note (optional)"
        placeholder="e.g. Offer letter reference"
        value={values.note}
        onChange={(e) => set("note", e.currentTarget.value)}
        error={errors.note}
        autosize
        minRows={2}
      />
    </ActionModal>
  );
}
