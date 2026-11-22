const formatters = new Map<string, Intl.NumberFormat>();

/** Formats whole units of a currency, e.g. formatMoney(70000, "EUR") → "€70,000". */
export function formatMoney(amount: number, currency: string): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(amount);
}
