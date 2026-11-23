# AI Usage Log

How AI tools were used on this project: key prompts, what the AI suggested, and
where I accepted, refined or overrode it.

Tool: Claude Code (Claude Opus) as a pair-programming partner. Rules for the AI
live in [CLAUDE.md](../CLAUDE.md).

## 1. Requirements discovery

Prompt (summarised): I gave the AI the problem statement and asked it to work with me
like a senior engineer: ask me questions about the HR Manager's needs first, offer
a/b/c options for each decision, and write no code until we agree.

Process: the AI asked 14 scoping questions, each with options and a recommendation.
I reviewed the requirements draft in chat and asked for changes before any file was
written.

| Decision                  | AI suggested                                                   | Outcome                                                                                                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Salary history            | Current comp + append-only history                             | Refined (see corrections)                                                                                                                                                                                                          |
| Currency                  | Local storage + fixed USD reporting                            | **Extended by me:** user-selectable display currency                                                                                                                                                                               |
| Analytics breadth         | Few features, done well                                        | I first wanted all six. The AI showed that four share one aggregation engine (cheap breadth) and proposed depth on peer outliers, leaving pay-equity out. **Agreed.**                                                              |
| Data entry                | Forms + CSV import                                             | Accepted                                                                                                                                                                                                                           |
| Auth                      | Simple login                                                   | **Overridden:** no auth for the demo; documented as an omission                                                                                                                                                                    |
| Compensation              | Base + target bonus                                            | I first chose full total comp. The AI argued equity/benefits have no honest single value. I then proposed performance-based variable pay; the AI flagged that payouts need performance cycles. **Settled on base + target bonus.** |
| Correcting mistakes       | Append-only; corrections as new entries that supersede the old | **Overridden:** I questioned how mistakes get fixed. We chose editing in place with every edit recorded in an audit log, so analytics stay correct and history is kept.                                                            |
| Audit of who changed data | Out of scope (no users without auth)                           | **Overridden:** I wanted it in scope. We record a hardcoded single actor via one getCurrentUser() function so auth can slot in later.                                                                                              |
| Audit coverage            | All employee + compensation changes in one log                 | Accepted                                                                                                                                                                                                                           |
| Peer group                | Title + level + country                                        | Accepted                                                                                                                                                                                                                           |
| Leavers                   | Soft-terminate                                                 | Accepted                                                                                                                                                                                                                           |
| Seed countries            | ~7                                                             | Accepted                                                                                                                                                                                                                           |

## 2. Design

Prompt (summarised): I asked the AI to propose the stack and architecture as options
with trade-offs, then reviewed the full DESIGN.md draft in chat before it was written.

| Decision             | AI suggested                                        | Outcome                                                                                                                                                                                                                                                                                                 |
| -------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend framework    | Fastify                                             | **Overridden:** Express (familiar, minimal)                                                                                                                                                                                                                                                             |
| Deployment shape     | One server serving API + built SPA                  | **Overridden:** separate deploys for web, API and DB. The AI noted the CORS / two-URL cost.                                                                                                                                                                                                             |
| Data access          | Drizzle ORM                                         | **Overridden:** Prisma                                                                                                                                                                                                                                                                                  |
| Language             | TypeScript                                          | I first said "all in JS". The AI pushed back (money arithmetic, shared API types, Prisma-generated types). **Accepted TypeScript.**                                                                                                                                                                     |
| Where analytics run  | SQLite, with median/outliers in pure TS             | **Challenged by me:** I didn't want stats computed in app code. The AI agreed this scales better in the DB, pointed out SQLite lacks percentiles and free hosts have ephemeral disks, and proposed Postgres. **Accepted Postgres.** Trade-off: analytics tests need a DB, so they're integration tests. |
| Component library    | Mantine                                             | Accepted (I left it to the AI)                                                                                                                                                                                                                                                                          |
| Current comp storage | Stored on Employee, synced in-transaction           | Accepted                                                                                                                                                                                                                                                                                                |
| Departments / titles | Reference tables                                    | Accepted                                                                                                                                                                                                                                                                                                |
| Outlier rule         | Peer compa-ratio, fixed band 0.80–1.20, min group 5 | I asked for an explanation with an example first. **Extended:** HR can adjust the band in the UI, with these as defaults.                                                                                                                                                                               |

## 3. Scaffolding

Prompt (summarised): I asked the AI to propose the repo layout and tooling, show every
config file in chat before writing it, and verify each commit (tests, typecheck, lint,
a live run) before committing.

| Decision             | AI suggested                                           | Outcome                                                                                                                  |
| -------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Lint / format        | ESLint + Prettier                                      | Accepted                                                                                                                 |
| Local database       | Docker Compose, separate dev and test databases        | Accepted                                                                                                                 |
| Quality gate         | CI (GitHub Actions) instead of pre-commit hooks        | I asked for an explanation of both, then **accepted CI only**                                                            |
| Docs formatting      | Keep Markdown out of Prettier                          | **Overridden:** format docs too. The AI checked the diff was whitespace-only and put it in its own `style(docs)` commit. |
| Pushing              | Push after every step                                  | **Overridden:** push at the end, since commit timestamps (not push times) show how the work evolved                      |
| Prisma timing        | Add it with the real schema, not as an empty file      | Accepted                                                                                                                 |
| Browser verification | Playwright in the repo, added with the first real page | Accepted                                                                                                                 |

Where AI verification caught problems:

- `npm install -w <new workspace>` silently installed nothing (twice). Caught by
  checking package.json afterwards and rerunning.
- `@types/node` resolved to v26 while the runtime is Node 24, so it was pinned to 24.
- Several dependencies resolved to major versions newer than the AI knew well (ESLint 10,
  TypeScript 6, Mantine 9, React Router 8, Vite 8). It checked their exports and config
  names in node_modules before writing code, rather than trusting memory.
- The AI couldn't see the browser and said so. I confirmed the UI rendered.

## 4. Data model

Decisions: job titles belong to departments (employee stores only the title); illustrative
FX rates; shared package consumed as TS source in dev/tests and compiled output in
production; hand-written CHECK constraints for rules Prisma's schema can't express.

Caught by verification before commit:

- `prisma.config.ts` used `env("DATABASE_URL")`, which made `npm install` fail on any
  machine without a .env (CI, deploy builds). Tested without a URL, then made it optional.

### Incident: fixing a dependency advisory

`npm audit` flagged a high-severity ReDoS in `effect`, pulled in by the Prisma CLI. I chose
to try an npm `overrides` entry. It went wrong in three steps:

1. npm accepted the override but kept the locked version.
2. The AI removed the lockfile entry to force re-resolution. npm then didn't install the
   package at all, Prisma's postinstall crashed, and `npm audit` reported "0
   vulnerabilities" only because the package was missing.
3. With the local CLI gone, bare `npx prisma` silently downloaded a Prisma 8 pre-release
   from the registry (read-only commands only; no damage).

The AI stopped, reported the failure, restored the lockfile from git, and reinstalled with
`npm ci`. All checks passed against the last commit. I then chose to document the advisory
instead (negligible risk, dev-only). Lessons recorded as project rules: run tools with
`npx --no-install`, and treat a "clean" result that follows a failed step as unverified.

## 5. Seed data

Prompt (summarised): before writing the generator, the AI asked six realism questions
(pay model, workforce mix, history depth, audit rows for seeded data, leavers and planted
outliers, names), each with a recommendation. I accepted all six.

Verification and what it caught:

- The tests check the whole 10k output: database rules, history invariants, and a mix within
  2 percentage points of the weights. Fixed seeds make the statistical checks non-flaky.
- An edit meant to replace invisible combining characters in a regex silently changed
  nothing. The AI found it by inspecting the file's bytes, then fixed it.
- The AI flagged that the history came out smaller than its own estimate (21.7k entries vs
  ~25–30k), rather than leaving the estimate standing.
- A rollback test proves one bad row leaves zero rows behind.
- Prisma 7 refused `migrate reset` because an AI agent ran it. The AI stopped, explained the
  command, its effect and its target (the local `salary_dev`), and asked. I consented
  explicitly before it ran.

## 6. Employee list

Prompt (summarised): the AI proposed the API contract and UI plan with options (paging style,
search behaviour, when to add the currency selector, how to sort pay across currencies,
where table state lives); I chose page numbers, contains-search, USD-equivalent pay sorting and
URL state.

My UI overrides after reviewing the first version in the browser:

| Area            | AI built / suggested                | Outcome                                                                                                  |
| --------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Filter layout   | Inline multi-selects in the toolbar | **Overridden:** they grew and shifted the page. I asked for a Filters button opening a modal with Apply. |
| Search feedback | Debounce only                       | **Extended by me:** a spinner while searching.                                                           |
| Status switch   | Keep it in the toolbar              | **Overridden:** moved into the modal for a cleaner UI.                                                   |
| Applied filters | Removable chips under the toolbar   | **Overridden:** chips removed; the badge count is enough, and filters are changed in the modal.          |
| Seed hire dates | Reduce the share of recent hires    | **Declined by me:** kept as is.                                                                          |

Verification and what it caught:

- **Mutation check:** the AI temporarily broke the USD pay sort (sorting raw local amounts)
  and confirmed exactly that test failed, proving the test guards the currency bug.
- **Playwright screenshots** (before committing UI changes) caught two bugs unit tests missed:
  "Reset" in the modal didn't clear filters on Apply (now a unit-tested pure function), and the
  terminated badge rendered a `<div>` inside a `<p>` (React console error).
- **Lint** caught state being synced in an effect (switched to React's recommended pattern)
  and another invisible character in a test regex.
- **E2E debugging:** three failures, each diagnosed from Playwright's saved page snapshot
  rather than by guessing (wrong ARIA role, an open dropdown covering the next field, a
  non-searchable dropdown that toggles closed). All were test mistakes, not app bugs. The suite
  then passed three runs in a row before it was committed.
- **Resolution check:** the web build's use of the shared package's TypeScript source, untested
  since it was set up, was confirmed when the first web module imported it.

### Incident: a folder moved mid-task

While writing the `/meta` endpoint, `apps/api` was moved into `apps/web/api` between two of the
AI's file writes (most likely an accidental drag in the editor; no command in the session moves
folders). The AI noticed because the check output didn't add up (missing API test results, a
failed request, "file not found" from the leak scan), stopped, located the moved folder,
explained what happened and asked before moving it back. It then confirmed `git status`
showed only the intended changes and re-ran every check before committing.

## 7. Employee detail and actions

Prompt (summarised): the AI proposed the API, business rules and UI for viewing and changing
employees, with options, then built it in eight commits, each checked before committing.

| Decision         | AI suggested                                                                 | Outcome                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Detail view      | Separate page `/employees/:code`                                             | Accepted                                                                                                                                   |
| Changing country | A "Relocate" action: new country + pay in its currency as one event          | Accepted                                                                                                                                   |
| Pay changes      | One "Change pay" form; promotions add level/title in the same event          | Accepted                                                                                                                                   |
| Add employee     | Include it in this step                                                      | Accepted                                                                                                                                   |
| Backdating       | New pay changes must be after the latest entry; fix old ones via corrections | **Proposed by the AI after starting**, flagged for my confirmation with the reasoning (currency consistency across relocations). Accepted. |

Verification and what it caught:

- **Rollback:** the AI temporarily broke the last step of creating an employee (the audit
  write) and confirmed nothing was left behind: 0 employees, 0 pay entries, 0 audit rows.
- **A time zone bug**, found only because a browser run happened at 00:30 my time: "today" was
  computed in UTC, so anyone east of UTC was told today's date was in the future each morning.
  Fixed by treating "today" as the date in UTC+14, with a unit test at the exact boundary.
- **Developer-facing messages** ("expected string to have >=1 characters") spotted in a
  screenshot; rewritten in plain words in the shared schemas, with tests.
- **Notifications covering buttons**, spotted because one e2e step took 5.8 s while others took
  under 1 s. A Playwright trace showed a single click waiting ~5 s for the button to be uncovered.
  Moving notifications to the bottom-right brought the step to 0.7 s.
- **A redundant request:** the detail page fetched the audit history even for unknown employees.
- **A library warning traced, not ignored:** a `pg` deprecation warning was traced into
  Prisma's adapter and reproduced with one line (`findFirst` with `include` inside a
  transaction); documented as a known issue instead of restructuring our queries.

The AI's own slips, caught and corrected:

- Ran a test command from the wrong folder (the shell had stayed in `apps/api`) and reported
  it before rerunning from the repo root.
- Checked a fix against an API server it had started earlier without file watching, so the
  browser showed the old behaviour; noticed from the old message wording and restarted it.
- Two `grep` checks misreported (regex characters in the pattern); verified the files directly.
- A screenshot script read the previous step's notification; rewritten to wait for each step's
  own message.

## 8. Insights

Prompt (summarised): the AI proposed the three insights, their currency rules and the page
layout with options; it loaded data-visualisation guidance before designing the chart.

| Decision             | AI suggested                                               | Outcome                                                                  |
| -------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| Layout               | One page with tabs                                         | Accepted                                                                 |
| Pay explorer         | Stats table + bar chart of the median                      | Accepted                                                                 |
| Currency selector    | Global (list, detail, insights)                            | Accepted                                                                 |
| Recent changes       | Last 12 months; exclude hires and relocations from raise % | Accepted                                                                 |
| Currency persistence | Remembered in the browser instead of the URL               | Proposed by the AI (changing the earlier design), stated before building |

Verification and what it caught:

- **Ground truth for the depth feature:** the seed plants outliers and returns their codes; a
  test checks the detector finds them. Measured 207/209 with 0 false alarms; the AI traced the
  two misses (0.82 and 1.17, inside the band) rather than accepting 99% unexplained.
- **A 14-second query:** that test timed out because Postgres had stale statistics right after
  the bulk load (14 s vs 40 ms after `ANALYZE`). Fixed in the seed, with a test that fails
  without it; noted for CSV import.
- **Wrong numbers from a stale URL:** setting From then To dropped From, so the page showed 869
  changes for the wrong period instead of 600. Traced to building the next URL from render-time
  values; react-router's source showed its functional setter has the same issue. Fixed in every
  page, with an e2e regression test.
- **The same bug in sorting:** a quick double click sorted ascending twice; found when the e2e run
  slowed down and an existing test failed.
- **Mixed-currency ranking:** the details table ranked ¥7.6M above €69k; it now follows the
  chart's single-currency order (unit-tested).
- **Chart readability** from screenshots: gridlines ran through the bars instead of marking
  values.

The AI's own slips, caught and corrected:

- A hand-calculated expected value in a test was wrong (165,517 instead of 142,241); the test
  failed and the test was corrected, not the code.
- Several test locators were wrong (hidden radio inputs, a label shared by a tile and a
  control, reading loading placeholders); each diagnosed from the error or page snapshot.
- **Committed despite a leak-scan hit:** the scan printed a match (a variable named with a word
  on the blocked list) but didn't stop the commit. The AI flagged it, renamed the variable,
  amended the unpushed commit, verified the whole history is clean, and made the scan gate
  commits from then on.

## 9. CSV import

Prompt (summarised): the AI proposed the file format, how to treat existing people and the
upload flow, with options. I chose one row per new employee, existing emails rejected, and check
then import, and **asked for the rules to be shown as instructions on the page**. The AI made
the instructions, the template and the server's checks come from one shared definition so they
can't drift apart.

Verification and what it caught:

- **A security advisory that applied to this code:** `csv-parse` 6.x had a prototype-replacement
  issue in its column mapping, which is exactly how uploaded files would have been parsed. The
  AI checked the advisory against our use (not just the audit count), confirmed the patched
  7.0.3 was two months old, upgraded, and also made the parser safe by design: rows as arrays,
  only known column names as keys, with a test using a hostile `__proto__` header.
- **A salary a thousand times too small:** the first version read `78.000` as 78. In much of
  Europe it means 78 thousand, so a German spreadsheet could have imported a salary of €78 that
  passed validation. The AI found this while re-reading its own test; dotted amounts are now
  rejected, and the page explains why.
- **Errors in one pass:** a row with format errors hid its unknown country and title until the
  next upload. Data checks now run for every well-formed column.
- **Scale:** a 10,000-row file checks in 164 ms and imports in 5.1 s, with statistics refreshed
  afterwards (the lesson from step 8).

The AI's own slips, caught and corrected:

- Test data with a stray quotation mark (the CSV was genuinely malformed, so it tested nothing).
- An expected value that no longer held once the validator reported more problems.
- An empty-upload test expected a 400, but the app's answer ("The file is empty", in the same
  report as any other problem) was better; the test was changed, not the app.
- A file-picker locator that targeted Mantine's visible button instead of the hidden input.

### Closing a gap before CI

Before moving on, the AI checked the requirements against what was built and pointed out that the
org-wide audit view promised in REQUIREMENTS.md still showed a "Coming soon" placeholder in the
sidebar. I chose to build it rather than drop it from scope.

## 10. CI

The AI drafted a GitHub Actions workflow (lint, format, typecheck, unit + integration tests,
then the e2e suite; Playwright report uploaded on failure) and I chose to run e2e on every
push. Since the workflow can only truly run on GitHub, the AI rehearsed it first: a fresh clone
of the repository with no `.env` and no `node_modules`, `npm ci`, then every command with only
the environment variables the workflow sets (`CI=1` included). All checks and 18 e2e tests
passed. It noted pinning actions to commit SHAs as a hardening step rather than doing it now.

## 11. Deploy

- **Production build first.** Before pushing, the AI ran the compiled API against the real
  database (the generated Prisma 7 client had only been tested in development mode) and served
  the production web build to check deep links. Both worked.
- **Public or private.** I chose a public repository. Before agreeing, the AI scanned every file,
  commit message and the whole history for softer hints than its usual leak scan ("reviewer",
  "submission", "deadline" and similar). It found only UI words ("submit" buttons, Mantine's
  `Tabs.Panel`) and pointed out that commit metadata shows my email address; I kept it.
- **Seeding a remote database failed** with "Unable to start a transaction in the given time".
  Prisma's 2 s / 5 s transaction defaults were fine locally but not for a serverless database
  waking up over a long network path. The AI confirmed nothing had been written, then gave both
  seed transactions generous limits.
- **A secret in the chat.** I ran the seed command with the database connection string inline in
  the AI session, so the password ended up in the session transcript. The AI flagged it straight
  away; I reset the password, updated Render, and re-ran the seed in a separate terminal. Lesson:
  secrets go into dashboards or a terminal outside the AI session, never into the conversation.
- **Vercel → Netlify.** I had trouble signing in to Vercel, so I asked to switch hosts. The AI
  replaced `vercel.json` with `netlify.toml`, rehearsed Netlify's build command on a clean copy,
  and updated the docs.
- **Checked live:** the AI drove the deployed site in a browser (list, filtered deep link,
  outliers, the audit log) and made one write from the site's own origin, a pay change noted as a
  deployment check, recorded in the audit log like any other change.
- **A clean start for the demo.** I asked to reset the hosted data. Destructive commands may only
  target the local dev, test and e2e databases, so the AI explained the command, its target and
  effect, and I ran it myself outside the session; the AI then confirmed 10,000 employees, an
  empty audit log and the same outlier counts as locally.

## 12. Wrap-up: what worked

- **Options, then my call.** Every decision came as a/b/c with a recommendation, and nothing was
  written before I agreed. The tables above show where I overrode the AI (auth, correcting
  mistakes, the audit log, the display currency, the filter layout).
- **Verification found what tests alone passed over.** Running the real app, measuring and
  re-reading its own work, the AI found: "today" rejected every morning east of UTC (fixed with
  the UTC+14 rule), a 14 s query after bulk loads (fixed with `ANALYZE`), `78.000` imported as
  78, and quick clicks dropping each other's URL changes. Each now has a test.
- **The AI's own slips were caught by checks it set up:** a commit that went ahead despite a
  leak-scan hit (the scan now aborts the commit), wrong test locators, expected values computed
  by hand. All were fixed before moving on and are recorded above.
- **What I found myself:** the filter panel pushing the page around (now a modal), that CSV rules
  belong on the page as instructions, and, while testing the live app, that a leaver can't be
  re-imported. That last one follows from my own decisions (leavers are kept; import is for new
  people) and I left it out of scope on purpose; rehiring is first among the next steps after
  sign-in.
