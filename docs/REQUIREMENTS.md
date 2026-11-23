# Salary Management — Requirements

## Goal

Replace spreadsheet-based salary management for an organisation of about 10,000 employees across multiple countries. The web app lets the **HR Manager** (a) maintain salary data reliably and (b) answer questions about how the organisation pays people.

## User & problem

- **Primary user:** the HR Manager (single user). Comfortable with Excel, not technical.
- **Today:** salary data lives in spreadsheets. Edits are error-prone, history gets overwritten, and answering "how do we pay engineers in Germany vs the UK?" means building pivot tables by hand across currencies.

## Scope & features

**1. Employee & compensation records**

- Employee fields: employee ID, name, email, country, department, job title, level (L1–L6), hire date, status (active or terminated, with an end date).
- Compensation: annual **base salary** and **target annual bonus**, in the employee's **local currency**. **Total cash = base + target bonus.**
- Browse all 10,000 employees with server-side search, filters (country, department, title, level, status), sorting and pagination.
- Create, edit, relocate (new country and pay in its currency, as one event) and terminate employees through forms. Terminating someone changes their status; it never deletes them.

**2. Salary history & audit**

- Each pay change (raise, promotion, adjustment) adds a compensation entry with an effective date, base, target bonus and reason. An employee's page shows the full timeline.
- Mistakes are fixed by correcting the entry (also for leavers); a reason is required.
- **Audit log:** every create, edit or termination of an employee or compensation entry is recorded with field, old → new, who, when and reason. It can be viewed per employee and across the org.
- For the demo the actor is a single fixed "HR Manager" user. Each audit record stores an actor ID, so real users drop in once auth exists.

**3. CSV import (migration from Excel)**

- Upload a CSV of **new** employees (existing people are changed in the app, where every change is audited). Every row is validated, with a per-row error report (row number, field, reason). Rows are imported only when the whole file is valid; there are no partial imports.

**4. Pay insights**

- **Pay explorer:** headcount, min, max, average, median and total payroll, grouped by country, department, job title or level, with filters. Switch between base and total cash.
- **Currency:** amounts are stored in local currency. A **display-currency selector** offers "Local" or any currency in a static FX table (USD, EUR, GBP, INR…). Converted values are marked "≈" with the FX "as of" date. Stats that mix currencies use the selected currency (USD when "Local" is chosen).
- **Peer outliers:** flag employees paid well above or below their peer group, where peers share **job title + level + country**. There's a clear threshold rule, and peer groups too small to be meaningful are skipped.
- **Recent changes:** raises within a date range, with the count and average raise %.

**5. Seed data**

- A deterministic seed script generates 10,000 employees across about 7 countries (e.g. US, UK, DE, IN, BR, JP, SG) with realistic local pay levels by role and level.

## Deliberately out of scope

| Left out                                  | Why                                                                                                                                                                                                                  |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication / roles                    | Single-user demo. Changes are attributed to a fixed "HR Manager" user via one `getCurrentUser()` function that real auth (SSO + role-based access) would replace. Trade-off: anyone with the demo URL can edit data. |
| Equity & benefits                         | There's no single honest value per employee (vesting, valuation, country-specific statutory benefits). Modelling them would mean inventing numbers.                                                                  |
| Actual bonus payouts / performance cycles | These belong to a performance-management system. We store the _target_ bonus, which is what can be compared across people.                                                                                           |
| Gender / pay-equity analysis              | It needs sensitive personal data, and a simple pay-gap figure is misleading without proper statistical controls. It's the most valuable next step, if done carefully.                                                |
| Live FX rates                             | They add an external dependency and make numbers shift day to day. A dated static table gives reproducible numbers.                                                                                                  |
| Future-dated / retroactive changes        | Scheduling changes by effective date adds a lot of complexity. History records changes as they're made.                                                                                                              |
| Payroll processing, tax, Excel export     | Different products, outside "manage and understand pay".                                                                                                                                                             |
| Rehiring a leaver                         | Leavers keep their record (and email), so re-adding or re-importing them is rejected. Rehiring needs its own rules: the same or a new code, and how the earlier history is shown.                                    |

## Success criteria

- The HR Manager can find any employee, update their pay, and see when and why it changed.
- The HR Manager can answer "how do we pay role X at level Y in country Z, and who is out of line?" in a few clicks.
- Every change can be traced: what changed, from what to what, when, by whom and why.
- Lists and insights respond quickly on 10,000 employees (target under 300 ms on the server).
- Core logic (stats, currency conversion, outlier detection, import validation) is covered by fast, deterministic unit tests.
