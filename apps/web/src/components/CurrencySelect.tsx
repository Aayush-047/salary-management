import { Select } from "@mantine/core";
import { useMeta } from "../api/queries";
import { LOCAL_CURRENCY } from "../lib/display-currency";
import { useDisplayCurrency } from "./display-currency-context";

/** Header control: show pay in each employee's own currency, or converted into one. */
export function CurrencySelect() {
  const { currency, setCurrency } = useDisplayCurrency();
  const meta = useMeta();
  const codes = Object.keys(meta.data?.fx.ratesToUsd ?? {}).sort((a, b) =>
    a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b),
  );

  return (
    <Select
      aria-label="Display currency"
      size="xs"
      w={190}
      allowDeselect={false}
      value={currency}
      onChange={(value) => value && setCurrency(value)}
      data={[
        { value: LOCAL_CURRENCY, label: "Local currency" },
        ...codes.map((code) => ({ value: code, label: `Show in ${code}` })),
      ]}
      title={meta.data ? `Conversions use static rates as of ${meta.data.fx.asOf}` : undefined}
    />
  );
}
