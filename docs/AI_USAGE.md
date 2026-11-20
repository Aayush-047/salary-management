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

| Decision | AI suggested | Outcome |
|---|---|---|
| Salary history | Current comp + append-only history | Refined (see corrections) |
| Currency | Local storage + fixed USD reporting | **Extended by me:** user-selectable display currency |
| Analytics breadth | Few features, done well | I first wanted all six. The AI showed that four share one aggregation engine (cheap breadth) and proposed depth on peer outliers, leaving pay-equity out. **Agreed.** |
| Data entry | Forms + CSV import | Accepted |
| Auth | Simple login | **Overridden:** no auth for the demo; documented as an omission |
| Compensation | Base + target bonus | I first chose full total comp. The AI argued equity/benefits have no honest single value. I then proposed performance-based variable pay; the AI flagged that payouts need performance cycles. **Settled on base + target bonus.** |
| Correcting mistakes | Append-only; corrections as new entries that supersede the old | **Overridden:** I questioned how mistakes get fixed. We chose editing in place with every edit recorded in an audit log, so analytics stay correct and history is kept. |
| Audit of who changed data | Out of scope (no users without auth) | **Overridden:** I wanted it in scope. We record a hardcoded single actor via one getCurrentUser() function so auth can slot in later. |
| Audit coverage | All employee + compensation changes in one log | Accepted |
| Peer group | Title + level + country | Accepted |
| Leavers | Soft-terminate | Accepted |
| Seed countries | ~7 | Accepted |
