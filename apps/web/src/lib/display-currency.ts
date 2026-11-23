import { LOCAL_CURRENCY } from "@salary/shared";
import { convertAmount } from "./fx";

export { LOCAL_CURRENCY };

export type DisplayedAmount = {
  amount: number;
  currency: string;
  /** True when converted from another currency (shown with "≈"). */
  converted: boolean;
};

/**
 * What to show for an amount held in `from` when the user chose `display`: the original amount
 * for LOCAL (or the same currency), otherwise the amount converted at the static rates and
 * rounded to whole units. Falls back to the original if a rate is missing.
 */
export function displayAmount(
  amount: number,
  from: string,
  display: string,
  ratesToUsd: Readonly<Record<string, number>> | undefined,
): DisplayedAmount {
  if (display === LOCAL_CURRENCY || display === from || !ratesToUsd) {
    return { amount, currency: from, converted: false };
  }
  const converted = convertAmount(amount, from, display, ratesToUsd);
  if (converted === null) return { amount, currency: from, converted: false };
  return { amount: Math.round(converted), currency: display, converted: true };
}

const STORAGE_KEY = "salary-management.display-currency";

/** The saved choice, or LOCAL. Storage can be unavailable (private mode), so never throw. */
export function loadDisplayCurrency(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? LOCAL_CURRENCY;
  } catch {
    return LOCAL_CURRENCY;
  }
}

export function saveDisplayCurrency(currency: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, currency);
  } catch {
    // Not saved; the choice still applies for this visit.
  }
}
