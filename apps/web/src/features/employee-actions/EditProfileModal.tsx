import { UpdateEmployeeSchema, type EmployeeDetail, type MetaResponse } from "@salary/shared";
import { Group, Select, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useUpdateEmployee } from "../../api/mutations";
import { ActionModal } from "./ActionModal";
import { changedFields } from "./form";
import { useActionForm } from "./useActionForm";

type Props = {
  opened: boolean;
  employee: EmployeeDetail;
  meta: MetaResponse | undefined;
  onClose: () => void;
};

/** Mounted only while open, so each opening starts from the employee's current values. */
export function EditProfileModal(props: Props) {
  return props.opened ? <EditProfileForm {...props} /> : null;
}

function EditProfileForm({ employee, meta, onClose }: Props) {
  const original = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    jobTitle: employee.jobTitle,
    level: employee.level,
    hireDate: employee.hireDate,
  };
  const { values, set, errors, validate, fail } = useActionForm({ ...original, note: "" });
  const save = useUpdateEmployee(employee.employeeCode);

  const submit = () => {
    const { note, ...edited } = values;
    const input = validate(UpdateEmployeeSchema, { ...changedFields(original, edited), note });
    if (!input) return;
    save.mutate(input, {
      onSuccess: () => {
        notifications.show({ color: "green", message: "Profile updated" });
        onClose();
      },
      onError: fail,
    });
  };

  return (
    <ActionModal
      opened
      title={`Edit profile · ${employee.employeeCode}`}
      submitLabel="Save changes"
      busy={save.isPending}
      errors={errors}
      onClose={onClose}
      onSubmit={submit}
    >
      <Group grow>
        <TextInput
          label="First name"
          value={values.firstName}
          onChange={(e) => set("firstName", e.currentTarget.value)}
          error={errors.firstName}
        />
        <TextInput
          label="Last name"
          value={values.lastName}
          onChange={(e) => set("lastName", e.currentTarget.value)}
          error={errors.lastName}
        />
      </Group>
      <TextInput
        label="Email"
        value={values.email}
        onChange={(e) => set("email", e.currentTarget.value)}
        error={errors.email}
      />
      <Group grow>
        <Select
          label="Job title"
          data={(meta?.departments ?? []).map((d) => ({ group: d.name, items: d.jobTitles }))}
          value={values.jobTitle}
          onChange={(v) => v && set("jobTitle", v)}
          searchable
          allowDeselect={false}
          error={errors.jobTitle}
        />
        <Select
          label="Level"
          data={(meta?.levels ?? []).map((l) => ({ value: String(l), label: `L${l}` }))}
          value={String(values.level)}
          onChange={(v) => v && set("level", Number(v))}
          allowDeselect={false}
          error={errors.level}
        />
      </Group>
      <TextInput
        type="date"
        label="Hire date"
        description="Also moves the hire entry in the pay history"
        value={values.hireDate}
        onChange={(e) => set("hireDate", e.currentTarget.value)}
        error={errors.hireDate}
      />
      <Textarea
        label="Reason for the change"
        placeholder="e.g. Surname was misspelled"
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
