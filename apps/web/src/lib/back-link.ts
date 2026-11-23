/** Navigation state for opening an employee: where "Back" returns to, and what it says. */
export type BackLinkState = { backTo: string; backLabel: string };

export function backLinkState(backTo: string, backLabel: string): BackLinkState {
  return { backTo, backLabel };
}

/** The back link for the detail page; the employee list when opened directly (e.g. a shared URL). */
export function resolveBackLink(state: unknown): BackLinkState {
  const given = state as Partial<BackLinkState> | null;
  if (given?.backTo?.startsWith("/") && given.backLabel) {
    return { backTo: given.backTo, backLabel: given.backLabel };
  }
  return { backTo: "/employees", backLabel: "Back to employees" };
}
