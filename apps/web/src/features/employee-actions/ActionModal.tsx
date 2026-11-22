import { Alert, Button, Group, Modal, Stack } from "@mantine/core";
import type { FormEvent, ReactNode } from "react";
import { FORM_ERROR, type FieldErrors } from "./form";

type Props = {
  opened: boolean;
  title: string;
  submitLabel: string;
  submitColor?: string;
  busy: boolean;
  errors: FieldErrors;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
};

/** Shared shell for every action: form body, a form-level error, Cancel and Submit. */
export function ActionModal({
  opened,
  title,
  submitLabel,
  submitColor,
  busy,
  errors,
  onClose,
  onSubmit,
  children,
}: Props) {
  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="lg" centered>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md">
          {children}
          {errors[FORM_ERROR] && (
            <Alert color="red" variant="light" title="Couldn't save">
              {errors[FORM_ERROR]}
            </Alert>
          )}
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" loading={busy} color={submitColor}>
              {submitLabel}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
