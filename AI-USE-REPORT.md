# AI-use report

Candidate: Liam Golan
Date: 2026-11-18
Repository / submission link: _placeholder — add the link when you submit_

This report records what the tools actually did in this working session. Lines marked for you are blank on purpose. Replace the drafts only if they match what you want to say.

## 1. Completion checklist

- [x] The application starts using the documented steps. The API was started with `npm run dev` from `server` on Node 26.13.1, and the Vite dev server served the client at http://localhost:5173.
- [x] The database can be initialized from a clean state. A new Compose volume created `tasks` and `tasks_test`, and `001_init.sql` applied to both.
- [x] The core task create, read, update, and delete flows work. Checked in the browser and through the API.
- [x] Filtering, searching, sorting, and pagination work together. Browser: title search, priority filter, and due-date descending order. Automated tests also cover combined filters, totals, and a valid page past the end. The browser smoke had one page of data, so the Previous/Next buttons were disabled rather than walked across multiple pages.
- [x] Validation and error states are demonstrated. A too-short title kept the form values. The first attempt also exposed a real bug, fixed before the successful create: an empty description was sent as `null` and rejected.
- [x] Status history is persisted and retrievable. One `TODO` to `IN_PROGRESS` change produced one history row. After delete, the task and its history return 404.
- [x] Automated tests run successfully. `npm test` in `server`: 30 passed, 0 failed (26 API tests, 4 guard tests), against Postgres 16 in Docker.
- [x] No secrets, credentials, or personal data are committed. The only credentials are the local example user `tasks` / password `tasks` in `.env.example`. `.env` is gitignored. This folder was not made into a git commit.
- [x] README and API documentation are included.

## 2. AI-use disclosure

### Which AI tools did you use, and for what tasks?

Observed in this session:

- Cursor Grok, as the lead, wrote the frozen contract, Compose file, test-database init script, environment example, README, and this report. It also integrated the two implementation branches, fixed the defects below, and ran the verification.
- Cursor Composer (`composer-2.5-fast`) implemented `server/` (schema, API, and tests) and, in parallel, `client/` (the React table and forms).
- A second Cursor Grok pass (`grok-4.7-xhigh-fast`) reviewed the integrated code and did not edit it. It reported no contract mismatch in the areas it was asked to check.

### Give one example of a prompt that materially helped.

The implementation agents were told to follow `docs/api-contract.md` and, before any test migration or truncate, abort unless `TEST_DATABASE_URL` names `tasks_test` and is not the development database. That constraint is what the guard and its four tests implement.

Liam, replace this with a prompt of your own if you want the example to be one you wrote.

### Give one example where AI output was incorrect, incomplete, insecure, or unsuitable.

The generated create schema accepted an omitted description, but not JSON `null`. The form sends `null` for an empty description. The first browser create failed with `Expected string, received null` and left the typed title, assignee, and due date on screen. `server/src/validation/task-schemas.ts` now treats `null` like a blank.

Two smaller misses, also fixed before handoff: `createClock()` with no argument froze "today" at process start, and the concurrent-update test treated "either response is 200" as success. Both responses must now be 200, and the API uses a clock that reads the current time.

### What did you change or reject, and why?

Lead changes, recorded so you can decide what you stand behind:

- Accepted `null` description and assignee on create, because a blank field should not be a 400.
- Split the live clock from the fixed test clock.
- Required both concurrent status updates to return 200.
- Published Postgres on host port 5434. Port 5432 is a Postgres already installed on this machine, and 5433 is reserved by another local Docker project.
- Changed the narrow layout from a clipped scrolling table to stacked rows after a 390px check cut columns off mid-word.

Liam — what you changed or rejected, in your own words:

________________________________________________________________________________

### How did you verify generated code?

Commands actually run, and what they printed:

```bash
nvm use   # Node v26.13.1
docker compose up -d
docker compose exec db pg_isready -U tasks -d tasks
# both databases present: tasks, tasks_test
cd server && npm ci && npm run migrate && npm run migrate:test && npm test
cd server && npm run typecheck && npm run build
cd client && npm ci && npm run typecheck && npm run build
```

`npm test` result after the fixes, on Postgres 16 from Compose: `Test Files 2 passed (2)`, `Tests 30 passed (30)`.

Browser, at http://localhost:5173, against the API on port 3001:

- Empty state: "No tasks yet."
- Create with title `ab` kept the form and showed a validation error.
- Create "Ship task API", assignee Liam, due 2026-11-20. The list showed it.
- Create "Write the README", priority High, due 2026-11-25.
- Search `ship` left one row: "Page 1 of 1 (1 tasks)".
- Priority High left "Write the README".
- Due date descending listed 2026-11-25, then 2026-11-20.
- Edit offered only To do and In progress. Saving moved "Ship task API" to In progress.
- `GET /api/tasks/ec432427-fa47-4616-a322-5c32f13187ef/status-history` returned one row, `TODO` to `IN_PROGRESS`.
- Cancel on delete left the task. Confirm delete removed "Write the README". The list showed "Task deleted" and one remaining task.
- `GET` of the deleted id, and of its history, both returned 404 `Task not found`.
- At 390px the row showed title, status, priority, assignee, due date, and actions without clipping. At a wide viewport the filters sat in a row and the data was a table.

The independent review did not re-run the tests. It read the code and reported no mismatch with the contract in the areas above.

### Which part of the solution did you design or implement most independently?

Liam:

________________________________________________________________________________

### What would you ask AI to help with next, and what would you review yourself?

Liam:

________________________________________________________________________________

## 3. Candidate self-review

Drafts below describe the code that was submitted. Confirm, rewrite, or delete them.

### What is the strongest engineering decision in your solution?

Draft: The status update locks the current row and writes the task and at most one history row in the same transaction. That is separate from lost updates, which still need a version check.

### What is the largest known weakness or risk?

Draft: Delete removes history with the task, and two stale clients can still overwrite each other's title, priority, assignee, or due date. There is no version column.

### What would you improve with another two hours?

Draft: Add the version check and return 409 with the current task. Show status history on the edit form. Add a request log with the task id and the columns that changed.

### Which requirement did you interpret or simplify, and what assumption did you make?

Draft: Description and assignee are optional even though create lists them beside the required fields. Status may be any allowed value on create, and the `TODO → IN_PROGRESS → DONE` chain applies only to updates. Reopening is not supported. History lasts only as long as the task.

Liam — your own answers:

Strongest decision:

________________________________________________________________________________

Largest weakness:

________________________________________________________________________________

Two more hours:

________________________________________________________________________________

Interpreted requirement:

________________________________________________________________________________
