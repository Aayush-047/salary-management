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
