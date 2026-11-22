import { NumberInput, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { toAmount } from "./form";

type Props = {
  label: string;
  currency: string;
  required?: boolean;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  error?: string | undefined;
  description?: ReactNode;
};

/** Whole-unit amount with thousands separators and the currency code shown alongside. */
export function MoneyInput({
  label,
  currency,
  value,
  onChange,
  error,
  description,
  required,
}: Props) {
  return (
    <NumberInput
      label={label}
      required={required}
      value={value ?? ""}
      onChange={(v) => onChange(toAmount(v))}
      error={error}
      description={description}
      thousandSeparator=","
      allowDecimal={false}
      allowNegative={false}
      hideControls
      rightSection={
        <Text size="xs" c="dimmed">
          {currency}
        </Text>
      }
      rightSectionWidth={48}
    />
  );
}
