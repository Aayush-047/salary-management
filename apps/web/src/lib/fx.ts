/**
 * Converts an amount between currencies through USD using the static rates from /meta
 * (1 unit of a currency = rate USD). Returns null if either rate is unknown.
 */
export function convertAmount(
  amount: number,
  from: string,
  to: string,
  ratesToUsd: Readonly<Record<string, number>>,
): number | null {
  if (from === to) return amount;
  const fromRate = ratesToUsd[from];
  const toRate = ratesToUsd[to];
  if (!fromRate || !toRate) return null;
  return (amount * fromRate) / toRate;
}
