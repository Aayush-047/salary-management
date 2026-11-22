# Salary Management

A web app for an HR Manager to manage salary data for ~10,000 employees across multiple countries, and to answer questions about how the organisation pays people.

> 🚧 Work in progress: being built step by step. See the commit history and [docs/](docs/) for how it evolved.

## Stack

- **API:** Node.js, Express, TypeScript, Prisma, PostgreSQL
- **Web:** React, Vite, Mantine, TanStack Query, React Router
- **Tooling:** npm workspaces, Vitest, ESLint, Prettier, Docker Compose

## Quick start

Requires Node 24+ and Docker.

```bash
cp .env.example .env
npm install
npm run db:up      # Postgres in Docker (dev + test databases)
npm run db:migrate # apply migrations to the dev database
npm run db:seed    # reference data + 10,000 employees
npm run dev        # API on :3000, web on :5173
```

Open http://localhost:5173.

## Scripts

| Script                                    | What it does                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run dev`                             | Start API and web in watch mode                                                                                                            |
| `npm test`                                | Run all tests (integration tests need `db:up`)                                                                                             |
| `npm run test:unit -w @salary/api`        | API unit tests only (no database)                                                                                                          |
| `npm run test:integration -w @salary/api` | API integration tests against the `salary_test` database                                                                                   |
| `npm run test:e2e`                        | Browser tests (Playwright) on ports 3100/5174 against a freshly seeded `salary_e2e` database; first run: `npx playwright install chromium` |
| `npm run db:migrate` / `db:seed`          | Apply migrations / seed reference data + 10,000 employees (dev database)                                                                   |
| `npm run db:reset`                        | Wipe the dev database, re-apply migrations and reseed                                                                                      |
| `npm run typecheck`                       | Type-check every workspace                                                                                                                 |
| `npm run lint`                            | Lint the whole repo                                                                                                                        |
| `npm run format`                          | Format with Prettier                                                                                                                       |
| `npm run build`                           | Production build of every workspace                                                                                                        |
| `npm run db:up` / `db:down`               | Start / stop the Postgres container                                                                                                        |

## Repository layout

```
apps/api         Express API
apps/web         React frontend
packages/shared  Constants and validation schemas shared by API and web
docs/            Requirements, design notes and AI usage log
```

## Docs

- [Requirements](docs/REQUIREMENTS.md): goal, scope and what's deliberately left out
- [Design](docs/DESIGN.md): architecture, data model, API, trade-offs, performance
- [AI usage](docs/AI_USAGE.md): how AI tools were used, and where I overrode them
