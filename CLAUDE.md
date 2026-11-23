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
- Seed: deterministic (seed 42, reference date 2026-11-01), 10,000 employees, ~6% leavers,
  ~2% planted outliers, no audit rows.
- Stack (details: docs/DESIGN.md): TypeScript monorepo (npm workspaces: apps/api,
  apps/web, packages/shared). API: Express + Prisma + PostgreSQL. Web: React + Vite +
  Mantine + TanStack Query. Web, API and DB deployed separately.
- Analytics run in Postgres (percentile_cont, window functions); pure TS only for
  small rules (FX conversion, compa-ratio classification, CSV row validation).
- Current comp is stored on Employee, kept in sync with the latest entry in the
  same transaction.
- Departments and job titles are reference tables, not free text.
- Money: integers in whole units of local currency.
- Outliers: peer compa-ratio = pay ÷ peer median; defaults 0.80–1.20, min group 5,
  adjustable by HR in the UI.
- Process: CI via GitHub Actions (no pre-commit hooks); push to a private repo at the end
  (needed before deploy).
- Employee list: page-number paging with totals; pay sorts compare USD equivalents; list
  state lives in the URL (shared schema). Filters live only in a modal (Apply / Reset /
  Cancel); the Filters button shows a count badge; no filter chips.
- E2E: Playwright on ports 3100/5174 against `salary_e2e`, rebuilt and seeded before each run;
  `npm run test:e2e`, separate from `npm test`. Projects: `read-only` first, then `actions`
  (writes data, retries off).
- Employee changes (rules in docs/DESIGN.md): employees addressed by code in URLs; every write
  is one transaction with one audit row; new pay changes must be after the latest entry (no
  backdating; fix old entries via corrections); "no future dates" means not after today in
  UTC+14; relocation is one event with a RELOCATION pay entry; leavers are read-only except
  pay corrections.
- User-facing validation messages live in the shared zod schemas (plain words for HR).
- Long-running dev servers started for checks don't reload: restart them after code changes.
  Use absolute paths in commands that matter (the shell's directory can persist).
- Check UI changes with Playwright screenshots (scratchpad script) before committing; fix any
  console errors they reveal.
- Dependencies resolve to recent majors; verify library APIs in node_modules before use.
- Run local tools with `npx --no-install` (or npm scripts), never bare `npx`: if a tool is
  missing, bare npx silently downloads whatever version the registry has.
- Destructive DB commands (`prisma migrate reset`): Prisma blocks AI agents. Explain the
  command, its effect and its target, and ask the user explicitly. Only ever run them
  against `salary_dev` / `salary_test` / `salary_e2e`.
- Insights: every insight reuses the list's filter SQL; LOCAL keeps own currency only for
  by-country breakdowns, anything mixing countries is converted (USD by default); charts are
  always single-currency. Display currency is remembered in the browser, not the URL; timelines
  and forms stay in the record's own currency.
- Build the next URL from `latestSearchParams()` (the URL now), never from render-time values.
- Run `ANALYZE` on tables after any bulk insert (seed, CSV import).
- The leak scan must gate the commit (abort on a match), never just print; scan history too
  before pushing.
