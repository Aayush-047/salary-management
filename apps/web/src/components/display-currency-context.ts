import { createContext, useContext } from "react";
import { useMeta } from "../api/queries";
import { LOCAL_CURRENCY, displayAmount, type DisplayedAmount } from "../lib/display-currency";
import { formatMoney } from "../lib/money";

type DisplayCurrencyState = { currency: string; setCurrency: (currency: string) => void };

export const DisplayCurrencyContext = createContext<DisplayCurrencyState>({
  currency: LOCAL_CURRENCY,
  setCurrency: () => {},
});

export function useDisplayCurrency(): DisplayCurrencyState {
  return useContext(DisplayCurrencyContext);
}

export type ShownMoney = DisplayedAmount & {
  /** e.g. "≈ $81,200" when converted, "€70,000" otherwise. */
  text: string;
  /** The amount in its own currency, e.g. "€70,000". */
  original: string;
};

/** Formats amounts in the chosen display currency, using the static rates from /meta. */
export function useMoney(): (amount: number, currency: string) => ShownMoney {
  const { currency: display } = useDisplayCurrency();
  const rates = useMeta().data?.fx.ratesToUsd;
  return (amount, currency) => {
    const shown = displayAmount(amount, currency, display, rates);
    const text = formatMoney(shown.amount, shown.currency);
    return {
      ...shown,
      text: shown.converted ? `≈ ${text}` : text,
      original: formatMoney(amount, currency),
    };
  };
}
