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

/** Large totals in short form, e.g. formatMoneyCompact(852_300_000, "USD") → "$852.3M". */
export function formatMoneyCompact(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}
