import { TerminateSchema, type EmployeeDetail } from "@salary/shared";
import { Alert, TextInput, Textarea } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTerminate } from "../../api/mutations";
import { ActionModal } from "./ActionModal";
import { todayIso } from "./form";
import { useActionForm } from "./useActionForm";

type Props = {
  opened: boolean;
  employee: EmployeeDetail;
  onClose: () => void;
};

export function TerminateModal(props: Props) {
  return props.opened ? <TerminateForm {...props} /> : null;
}

function TerminateForm({ employee, onClose }: Props) {
  const { values, set, errors, validate, fail } = useActionForm({
    terminationDate: todayIso(),
    note: "",
  });
  const save = useTerminate(employee.employeeCode);

  const submit = () => {
    const input = validate(TerminateSchema, values);
    if (!input) return;
    save.mutate(input, {
      onSuccess: () => {
        notifications.show({
          color: "gray",
          message: `${employee.firstName} ${employee.lastName} marked as left`,
        });
        onClose();
      },
      onError: fail,
    });
  };

  return (
    <ActionModal
      opened
      title={`Terminate · ${employee.firstName} ${employee.lastName}`}
      submitLabel="Mark as left"
      submitColor="red"
      busy={save.isPending}
      errors={errors}
      onClose={onClose}
      onSubmit={submit}
    >
      <Alert color="orange" variant="light">
        The profile becomes read-only and leaves pay statistics by default. Pay entries can still be
        corrected. Nothing is deleted.
      </Alert>
      <TextInput
        type="date"
        label="Last day"
        value={values.terminationDate}
        onChange={(e) => set("terminationDate", e.currentTarget.value)}
        error={errors.terminationDate}
      />
      <Textarea
        label="Reason"
        placeholder="e.g. Resigned"
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
