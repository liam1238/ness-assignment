# AI-use report

Candidate: Liam Golan
Date: 2026-11-18
Repository / submission link: https://github.com/liam1238/ness-assignment

## 1. Completion checklist

- [x] The application starts using the documented steps. The API was started with `npm run dev` from `server` on Node 26.13.1, and the Vite dev server served the client at http://localhost:5173.
- [x] The database can be initialized from a clean state. A new Compose volume created `tasks` and `tasks_test`, and `001_init.sql` applied to both.
- [x] The core task create, read, update, and delete flows work. Checked in the browser and through the API.
- [x] Filtering, searching, sorting, and pagination work together. Automated tests cover combined filters, totals, and a valid page past the end. An early browser check had a single page of tasks, so Previous and Next stayed disabled. A later check, after 18 demo tasks were added and the list page size became 10, showed 20 tasks as "Page 1 of 2 (20 tasks)". Next opened page 2.
- [x] Validation and error states are demonstrated. A too-short title kept the form values. The first attempt also exposed a real bug, fixed before the successful create: an empty description was sent as `null` and rejected.
- [x] Status history is persisted and retrievable. One `TODO` to `IN_PROGRESS` change produced one history row. The edit dialog shows that history as a read-only list. After delete, the task and its history return 404.
- [x] Automated tests run successfully. See the separate test result below. That run is not the same check as the MUI browser session.
- [x] No secrets, credentials, or personal data are committed. The only credentials are the local example user `tasks` / password `tasks` in `.env.example`. `.env` is gitignored. Repository: https://github.com/liam1238/ness-assignment
- [x] README and API documentation are included.

## 2. AI-use disclosure

### Which AI tools did you use, and for what tasks?

- Cursor Grok, as the lead, wrote the frozen contract, Compose file, test-database init script, environment example, README, and this report. It integrated the implementation work, fixed the defects below, and ran the verification.
- Cursor Composer (`composer-2.5-fast`) implemented `server/` (schema, API, and tests) and, in parallel, the first `client/`.
- A second Cursor Grok pass (`grok-4.7-xhigh-fast`) reviewed the integrated code and did not edit it. It reported no contract mismatch in the areas it was asked to check.
- Cursor Composer (`composer-2.5-fast`) then created 18 demo tasks by posting them to the running API. The two tasks already in the database were left in place. The total became 20.
- Cursor Composer (`composer-2.5-fast`) then restyled the client with MUI. Below 720px each task is a card. The edit dialog still shows status history as a read-only list.

### Give one example of a prompt that materially helped.

“If Grok is handling implementation, start in Plan Mode. Present the architecture, API contract, agent assignments, and verification plan. Wait for my explicit approval before implementation.”

This helped because I could review the architecture and assumptions before the backend and frontend agents started working in parallel. Both agents then implemented against the same API contract.

### Give one example where AI output was incorrect, incomplete, insecure, or unsuitable.

The generated create schema accepted an omitted description, but not JSON `null`. The form sends `null` for an empty description. The first browser create failed with `Expected string, received null` and left the typed title, assignee, and due date on screen. `server/src/validation/task-schemas.ts` now treats `null` like a blank.

Two smaller misses, also fixed before handoff: `createClock()` with no argument froze "today" at process start, and the concurrent-update test treated "either response is 200" as success. Both responses must now be 200, and the API uses a clock that reads the current time.

### What did you change or reject, and why?

I asked for a planning and approval step before implementation so I could review the design decisions and agent assignments. I also added a requirement for the test runner to fail before migrating or truncating anything unless it was explicitly pointed at the dedicated test database. The tests reset database state, so I wanted a misconfigured environment to fail before touching development data. The guard also refuses to run when that URL is the same database as development.

### How did you verify generated code?

These are separate checks.

Automated tests, rerun on 18 Nov 2026 at 13:33 (UTC+2) with Node v26.13.1 against Postgres 16 in Docker on port 5434:

```text
Test Files  2 passed (2)
Tests       30 passed (30)
```

That is 26 API tests and 4 guard tests. This run was not part of the MUI browser session. The MUI change did not modify the server.

Browser, first pass, before the MUI restyle and before the 18 demo tasks:

- Empty state: "No tasks yet."
- Create with title `ab` kept the form and showed a validation error.
- Create "Ship task API", assignee Liam, due 2026-11-20. The list showed it.
- Create "Write the README", priority High, due 2026-11-25.
- Search `ship` left one row: "Page 1 of 1 (1 tasks)".
- Priority High left "Write the README".
- Due date descending listed 2026-11-25, then 2026-11-20.
- Edit offered only To do and In progress. Saving moved "Ship task API" to In progress.
- `GET /api/tasks/ec432427-fa47-4616-a322-5c32f13187ef/status-history` returned one row, `TODO` to `IN_PROGRESS`.
- Cancel on delete left the task. Confirm delete removed "Write the README".
- `GET` of the deleted id, and of its history, both returned 404 `Task not found`.
- At 390px the fields were readable. That pass still used a stacked row, not the later cards.

Browser, after the MUI restyle, at http://localhost:5173:

- The list showed "Page 1 of 2 (20 tasks)", 10 tasks on the page, sorted by due date ascending.
- Next opened page 2 of 2. The first row there was "Add audit log export", due 2026-11-24. The last was "Load-test 100k task list", due 2026-12-16.
- At 390px each task was a card with its title, status, due date, assignee, and Edit and Delete actions.
- Edit on "Ship task API" showed a read-only status history entry: "To do to In progress". A task with no status change showed "No status changes yet."

The independent review did not re-run the tests. It read the code and reported no mismatch with the contract in the areas it checked.

### Which part of the solution did you design or implement most independently?

My main contribution was shaping the implementation plan and deciding what belonged in the submission. I set up the workflow with Grok coordinating the work and Composer agents owning the backend and frontend separately. I reviewed the proposed API contract, business rules, and verification plan before giving the agents the go-ahead. The agents implemented the code, and the Grok lead integrated and verified it.

### What would you ask AI to help with next, and what would you review yourself?

I would ask AI to implement optimistic concurrency and add an integration test with two clients editing the same version of a task. I would review the database update condition, the API response when a version is stale, and the UI behavior when a conflict occurs. I would pay particular attention to whether the form preserves the user's unsaved changes so they can resolve the conflict.

## 3. Candidate self-review

### What is the strongest engineering decision in your solution?

The status change and its history entry are written in a single database transaction. The transaction locks the task row and checks the transition against the current stored status. If two requests ask for the same transition, the second sees that the status has already changed and adds no duplicate history entry.

### What is the largest known weakness or risk?

The API has no way to detect that an edit was based on an older version of a task. If two people change the same field from stale forms, the later save can overwrite the earlier one without either user being told. The row lock keeps status history consistent, but it does not detect stale edits.

### What would you improve with another two hours?

I would add a task version and require the client to send the version it originally loaded when saving. The API would reject stale edits with 409 Conflict. The UI would keep the draft and let the user reload the latest task before deciding what to reapply. I would add an integration test to verify that a stale request leaves both the task and its history intact.

### Which requirement did you interpret or simplify, and what assumption did you make?

I treated the due date as a calendar date and used UTC to define "today." The API rejects a past due date when a task is created or when its due date changes. An overdue task can still be edited without changing its due date. This lets the team update the status or assignee of late work without moving the deadline just to save the edit.
