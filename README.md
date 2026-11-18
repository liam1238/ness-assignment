# Team tasks

A small task board for a software team: create and edit work, filter and page through it, and keep a history of real status changes.

The supported runtime is **Node.js 26.13.1**, Active LTS (Lithium). `.nvmrc` pins that version. Both packages accept `>=26.13.1 <27`. Node 25 is not an LTS release and is not the runtime this project is set up for.

## Stack

- React 19, Vite 6, and MUI for the UI, with TanStack Query for server state.
- Express 4 and Zod 3 for the HTTP API.
- PostgreSQL 16, accessed with `pg` and parameterized SQL.
- Vitest and Supertest against a real `tasks_test` database.

Express is enough for six routes and keeps validation, rules, and SQL in separate modules. NestJS would spend this timebox on framework structure. Parameterized SQL makes the status update explicit: lock the row, validate it, update it, and insert at most one history row in the same transaction. An ORM would hide that sequence. PostgreSQL is the database because that transaction and row lock are the behavior under test. SQLite would remove Docker and weaken the concurrency check.

TanStack Query replaces hand-written cache invalidation. MUI supplies the layout, dialogs, and table. The theme is a light task tool: Inter, a deep blue accent, and hairline borders.

## Setup

From the repository root, with [nvm](https://github.com/nvm-sh/nvm):

```bash
nvm install
nvm use
node -v
```

`node -v` should print `v26.13.1`.

Load the example environment. Docker Compose reads `.env` by itself. The API does not: its npm scripts pass `--env-file=../.env`.

```bash
cp .env.example .env
```

Start PostgreSQL and wait until it accepts connections. The init script `docker/initdb/01-create-test-database.sql` runs only on a new volume and creates the empty `tasks_test` database. It does not create tables.

```bash
docker compose up -d
until docker compose exec db pg_isready -U tasks -d tasks; do sleep 1; done
docker compose exec db psql -U tasks -d tasks -c "SELECT datname FROM pg_database WHERE datname IN ('tasks', 'tasks_test') ORDER BY datname;"
```

The published host port is **5434** (`POSTGRES_PORT`). Port 5432 is left for a Postgres already installed on the machine, and 5433 is left because other local Docker projects often publish it.

Apply migrations, then test and start the API:

```bash
cd server
npm ci
npm run migrate
npm run migrate:test
npm test
npm run dev
```

`npm run migrate` uses `DATABASE_URL` and refuses a database named `tasks_test`. `npm run migrate:test` uses `TEST_DATABASE_URL` and refuses to run unless that URL names `tasks_test` and is not the development database. `npm test` uses the same guard before it migrates or truncates, and the test files run one at a time.

In a second shell:

```bash
cd client
nvm use
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` to http://localhost:3001.

To rebuild the databases from nothing:

```bash
docker compose down -v
docker compose up -d
until docker compose exec db pg_isready -U tasks -d tasks; do sleep 1; done
cd server
npm run migrate
npm run migrate:test
```

`down -v` deletes the Docker volume and the task data in it.

Production-style start after a build, still from `server` with the root `.env` present:

```bash
npm run build
npm start
```

Check types without running the apps:

```bash
cd server && npm run typecheck && npm run build
cd client && npm run typecheck && npm run build
```

There is no ESLint config. TypeScript strict mode is the static check.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Credentials and development database name for the Compose service. Example values are `tasks`. |
| `POSTGRES_PORT` | Host port published to the container's 5432. Example: `5434`. |
| `DATABASE_URL` | Development connection string, database name `tasks`. |
| `TEST_DATABASE_URL` | Test connection string, database name `tasks_test`. Required for tests. Never defaulted from `DATABASE_URL`. |
| `API_PORT` | API listen port. Example: `3001`. |

The example password is for a local database only. Do not reuse it anywhere else, and do not commit `.env`.

## Architecture

```
browser → Vite (proxies /api) → Express router → Zod
                                              → TaskService
                                              → TaskRepository
                                              → PostgreSQL
```

- `server/src/http` parses HTTP and maps errors. It does not decide transitions.
- `server/src/domain` owns status transitions, the UTC due-date rule, and when a history row is written.
- `server/src/db` owns SQL, migrations, and the test-database guard.
- `client/src/api.ts` is the only fetch layer. The page invalidates the task list after every mutation.

## Business rules

Statuses are `TODO`, `IN_PROGRESS`, and `DONE`. Priorities are `LOW`, `MEDIUM`, and `HIGH`.

A title is required. It is trimmed, then must be 3–120 characters. Description and assignee are optional text. Blank values are stored as null. Description is capped at 2000 characters and assignee at 80. Priority defaults to `MEDIUM`.

On create, status defaults to `TODO`. A client may send any of the three statuses. Creation does not write history, because there is no previous status.

Updates may stay on the same status, move `TODO` to `IN_PROGRESS`, or move `IN_PROGRESS` to `DONE`. Skipping a step and moving backward return `409` and save nothing in that request. `DONE` can stay `DONE` and cannot be reopened. A same-status update writes no history row.

Due dates are strict `YYYY-MM-DD` calendar dates. "Today" is the UTC date of the server clock, not the machine's local date. A date earlier than that UTC date is rejected on create. On update, the rule runs only when the request changes the due date. An omitted due date, or the same due date again, is left alone, so an overdue task can still be edited. The edit form also omits an unchanged due date.

`DATE` columns are read as strings so a calendar day is not shifted through a JavaScript `Date`.

### History lifetime and the row lock

Delete is a hard delete. `task_status_history.task_id` references `tasks(id) ON DELETE CASCADE`. Status history exists for the lifetime of the task and is removed with it. A history request after deletion returns `404`.

The update path takes `SELECT … FOR UPDATE` on the task, validates the locked row, updates the task, and inserts a history row only when the status changed. The lock serializes concurrent status changes. The second transaction sees the status committed by the first, so two attempts to apply the same change produce one history row. That protects history consistency.

The lock does not prevent lost updates from stale clients. Two people can each read a task, change different fields, and the later commit can overwrite the earlier one. Stopping that requires a version check or equivalent optimistic concurrency control. This application does not have that check.

## API

Base path `/api`. Error shape:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "field": "dueDate", "message": "Due date cannot be earlier than 2026-11-18 (UTC)" }]
  }
}
```

`400` validation, `404` missing task (`Task not found`), `409` illegal transition, `500` generic internal error with no stack trace. A UUID-shaped id that does not exist is `404`. Any other id is `400`.

Create:

```http
POST /api/tasks
```

```json
{ "title": "Ship task API", "dueDate": "2026-11-20", "assignee": "Liam" }
```

Response `201`:

```json
{
  "id": "2f4c1d2e-7b8a-4e1a-9c3d-6a5b4c3d2e1f",
  "title": "Ship task API",
  "description": null,
  "status": "TODO",
  "priority": "MEDIUM",
  "assignee": "Liam",
  "dueDate": "2026-11-20",
  "createdAt": "2026-11-18T09:00:00.000Z",
  "updatedAt": "2026-11-18T09:00:00.000Z"
}
```

List:

```http
GET /api/tasks?status=TODO&priority=HIGH&q=ship&sort=dueDate&order=asc&page=1&pageSize=20
```

`sort` is `dueDate` (default) or `createdAt`. `order` is `asc` (default) or `desc`. Due-date order breaks ties by `created_at ASC, id ASC`. Creation-date order breaks ties by `id ASC`. `page` defaults to 1 and `pageSize` defaults to 20, with a maximum of 50. Missing values use those defaults. Present but invalid values return `400` and are not clamped. A valid page past the end returns `200`, `"data": []`, and the true `total`.

`q` is a case-insensitive literal title substring. `\`, `%`, and `_` are escaped and the pattern is bound as a parameter: `title ILIKE $n ESCAPE '\'`. Those characters are not wildcards.

Other routes: `GET /api/tasks/:id`, `PATCH /api/tasks/:id`, `DELETE /api/tasks/:id` (`204`, empty body), `GET /api/tasks/:id/status-history`.

History items are `{ id, taskId, previousStatus, newStatus, changedAt }`, oldest first. No changes yet returns `{ "data": [] }`.

Illegal transition:

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot change status from TODO to DONE",
    "details": [{ "field": "status", "message": "Allowed transition is TODO to IN_PROGRESS" }]
  }
}
```

The contract notes live in [docs/api-contract.md](docs/api-contract.md).

## Assumptions

- One implicit team. Assignee is a free-text name, not a user account.
- Description and assignee are optional. The assignment lists them on create and does not give them constraints.
- The transition chain applies to updates. Create may start at any allowed status.
- Reopening is not supported.
- History is not kept after delete.

## Trade-offs

The list query counts and pages in the application. That is correct at this size and is the first thing to measure at 100,000 rows. Title search uses `ILIKE`, which is simple and will not use a btree index well. The UI asks for 10 tasks per page. Below 720px each task is a card. It is not a Kanban board. API documentation is these examples rather than a Swagger UI.

## Known limitations

- No version column, so stale clients can overwrite each other's non-status edits.
- Deleting a task deletes its history.
- No authentication or team boundary.
- The edit form shows status history as a read-only list. It cannot be edited there.
- No rate limiting, structured request logs, or deployment config.

## With more time

Add the version check described below, show a conflict when a stale edit loses, and log the task id with the columns that changed. Then replace the free-text assignee with the `task_assignees` table, still without storing a comma-separated list.

## Intentionally not implemented

Authentication, teams, optimistic concurrency, multiple assignees, reopening a done task, Kanban, soft delete, Swagger UI, Playwright, ESLint, comments, attachments, and deployment.

## Senior prompts

### How would you prevent silent lost updates from stale clients?

Add an integer `version` that starts at 1. The client sends the version it read, in `If-Match` or in the patch body. The update runs `UPDATE tasks SET …, version = version + 1 WHERE id = $1 AND version = $2`. Zero rows means someone else wrote first: return `409` and the current task. The client refetches and the user decides what to do.

The row lock in this code does not solve that problem. It only orders overlapping transactions so status history stays consistent. A lock released at the end of one request does not tell a client that its copy is stale.

### At 100,000 tasks, what would you measure and optimize first?

The list endpoint. Run `EXPLAIN (ANALYZE, BUFFERS)` for the real combination of status, priority, title search, and sort. The first changes would be a composite index that matches the common filter and sort, such as `(status, priority, due_date, id)`, and a `pg_trgm` GIN index if title search shows up in the plan as a large sequential scan. I would stop returning description in the list, and I would replace deep `OFFSET` with keyset pagination once the offset cost shows up. I would not start by sharding.

### Where and how would you enforce team-scoped authorization?

Put `team_id` on the task. Authentication middleware resolves the caller's allowed team ids. Every repository statement, including get, update, delete, list, and history, includes `team_id = ANY($allowed)`. A cross-team id returns `404`, the same response as a missing task, so the API does not reveal that the row exists. The check lives in the repository so a new route cannot forget it. This app has no users and one implicit team, so none of that is implemented.

### How would you investigate edits that seem to disappear, and prevent a repeat?

I would reproduce it with two clients and compare the patch bodies with the row before and after. The likely causes here are a client sending null for a field it did not mean to clear, a `409` the UI swallowed, a delete (which removes the row and its history), or a cache write that replaced a newer refetch. I would add a request id and a log of task id, changed columns, version, and row count. The version check above turns a silent overwrite into a conflict the user can see. Status history already shows status moves. It does not show other field edits, so I would not use it as proof that a title change was saved.

### How would you evolve the schema and API for multiple assignees?

Add `task_assignees(task_id, assignee_name)` with a primary key on both columns. Backfill one row from `tasks.assignee`, then stop writing that column and remove it in a later migration. The API replaces `assignee` with `assignees: string[]`. Filtering by a person becomes `EXISTS` on that table. I would not store a comma-separated list in the task row. If assignees become real users, the column becomes `user_id` with a foreign key, and the same table shape stays.

## Tests

`cd server && npm test` needs the root `.env`, a reachable `TEST_DATABASE_URL`, and the migrations. The runner aborts if that URL is missing, does not name `tasks_test`, or matches `DATABASE_URL`. Vitest runs files and tests serially because they share one database and truncate it. Date tests inject a fixed clock.
