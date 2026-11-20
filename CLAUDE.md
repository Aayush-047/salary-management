# CLAUDE.md — project rules & context

Salary management web app for an HR Manager: ~10,000 employees across multiple
countries. Built step by step in pair-programming style with AI.

## Rules
- Read CLAUDE.local.md if present (private, local-only context).
- Work in small agreed steps. No code until the step is agreed. Offer options (a/b/c)
  for decisions and let the user choose.
- Show drafts of docs/files in chat first; write them only after the user approves.
- After each agreed step: one focused commit, conventional style (docs:, feat:, test:, chore:).
- Keep docs current: docs/REQUIREMENTS.md, docs/DESIGN.md, docs/AI_USAGE.md (log key
  prompts/decisions, including where the user overrode AI suggestions). Update
  "Decisions so far" below as decisions are made.
- Tests: fast, deterministic (no wall-clock, no unseeded randomness), focused on core logic.

## Decisions so far (full scope: docs/REQUIREMENTS.md)
- Compensation: base salary + target annual bonus = total cash, in local currency.
  No equity, benefits or actual payouts.
- History: each pay change is a new compensation entry; mistakes are fixed by editing
  the entry (reason required).
- Audit: one audit log for every change to employees and compensation entries
  (field, old → new, actor, timestamp, reason). The salary timeline is a view of it.
- Actor: hardcoded single "HR Manager" via getCurrentUser(); no auth. Every audit row
  stores actor_id so auth can be added later.
- Currency: stored local; display-currency selector ("Local" or any currency in a
  static FX table); converted values marked ≈ with the FX "as of" date.
- Insights: pay explorer (stats by country/dept/title/level, base vs total cash),
  recent changes, peer outliers (peers = title + level + country).
  No gender/pay-equity analysis.
- Data entry: forms + CSV import (validate everything; all-or-nothing).
- Leavers: soft status (terminated + end date), excluded from analytics by default.
- Seed: deterministic, 10,000 employees, ~7 countries.
- Stack: TBD in DESIGN.md (preference: Node/TypeScript, SQLite, React/Next.js +
  component library).
