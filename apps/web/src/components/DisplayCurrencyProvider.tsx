import { useState, type ReactNode } from "react";
import { DisplayCurrencyContext } from "./display-currency-context";
import { loadDisplayCurrency, saveDisplayCurrency } from "../lib/display-currency";

/** Holds the user's display currency for the whole app and remembers it in this browser. */
export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState(loadDisplayCurrency);
  const choose = (next: string) => {
    setCurrency(next);
    saveDisplayCurrency(next);
  };
  return (
    <DisplayCurrencyContext.Provider value={{ currency, setCurrency: choose }}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}
