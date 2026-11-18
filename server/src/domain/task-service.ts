import { ZodError } from "zod";
import type { TaskRepository, TaskRow } from "../db/task-repository";
import { mapTask } from "../db/task-repository";
import type { Clock } from "../clock";
import { utcTodayString } from "../clock";
import { compareDateStrings, parseCalendarDate } from "./dates";
import {
  AppError,
  invalidTransition,
  notFound,
  validationError,
} from "./errors";
import type { PoolClient } from "pg";
import {
  createTaskSchema,
  listTasksQuerySchema,
  patchTaskSchema,
  type CreateTaskInput,
  type PatchTaskInput,
} from "../validation/task-schemas";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertUuid(id: string): void {
  if (!UUID_REGEX.test(id)) {
    throw validationError("Request validation failed", [
      { field: "id", message: "Must be a valid UUID" },
    ]);
  }
}

function zodToValidation(err: ZodError): AppError {
  const details = err.issues.map((i) => ({
    field: i.path.join(".") || "body",
    message: i.message,
  }));
  return validationError("Request validation failed", details);
}

function allowedTransitionMessage(from: TaskRow["status"]): string {
  switch (from) {
    case "TODO":
      return "Allowed transition is TODO to IN_PROGRESS";
    case "IN_PROGRESS":
      return "Allowed transition is IN_PROGRESS to DONE";
    case "DONE":
      return "DONE status cannot change";
  }
}

function validateStatusTransition(
  from: TaskRow["status"],
  to: TaskRow["status"],
): void {
  if (from === to) return;
  const ok =
    (from === "TODO" && to === "IN_PROGRESS") ||
    (from === "IN_PROGRESS" && to === "DONE");
  if (!ok) {
    throw invalidTransition(`Cannot change status from ${from} to ${to}`, [
      { field: "status", message: allowedTransitionMessage(from) },
    ]);
  }
}

export class TaskService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly clock: Clock,
  ) {}

  async create(body: unknown) {
    let input: CreateTaskInput;
    try {
      input = createTaskSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw zodToValidation(e);
      throw e;
    }

    const today = utcTodayString(this.clock);
    const due = parseCalendarDate(input.dueDate)!;
    if (compareDateStrings(due, today) < 0) {
      throw validationError("Request validation failed", [
        {
          field: "dueDate",
          message: `Due date cannot be earlier than ${today} (UTC)`,
        },
      ]);
    }

    const row = await this.repo.insertTask({
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "TODO",
      priority: input.priority ?? "MEDIUM",
      assignee: input.assignee ?? null,
      due_date: due,
    });
    return mapTask(row);
  }

  async getById(id: string) {
    assertUuid(id);
    const row = await this.repo.getById(id);
    if (!row) throw notFound();
    return mapTask(row);
  }

  async delete(id: string) {
    assertUuid(id);
    const deleted = await this.repo.deleteById(id);
    if (!deleted) throw notFound();
  }

  async list(query: Record<string, unknown>) {
    let parsed;
    try {
      parsed = listTasksQuerySchema.parse(query);
    } catch (e) {
      if (e instanceof ZodError) throw zodToValidation(e);
      throw e;
    }

    const page = parsed.page ?? 1;
    const pageSize = parsed.pageSize ?? 20;
    const sort = parsed.sort ?? "dueDate";
    const order = parsed.order ?? "asc";

    const { rows, total } = await this.repo.list({
      status: parsed.status,
      priority: parsed.priority,
      q: parsed.q,
      sort,
      order,
      page,
      pageSize,
    });

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

    return {
      data: rows.map(mapTask),
      page,
      pageSize,
      total,
      totalPages,
    };
  }

  async patch(id: string, body: unknown) {
    assertUuid(id);
    let input: PatchTaskInput;
    try {
      input = patchTaskSchema.parse(body);
    } catch (e) {
      if (e instanceof ZodError) throw zodToValidation(e);
      throw e;
    }

    const result = await this.repo.withLockedTask(id, async (client, task) => {
      return applyPatch(client, task, input, this.clock);
    });

    if (result === null) throw notFound();
    return result;
  }

  async statusHistory(id: string) {
    assertUuid(id);
    const task = await this.repo.getById(id);
    if (!task) throw notFound();
    const rows = await this.repo.getHistory(id);
    return {
      data: rows.map((r) => ({
        id: r.id,
        taskId: r.task_id,
        previousStatus: r.previous_status,
        newStatus: r.new_status,
        changedAt: r.changed_at.toISOString(),
      })),
    };
  }
}

async function applyPatch(
  client: PoolClient,
  task: TaskRow,
  input: PatchTaskInput,
  clock: Clock,
) {
  const today = utcTodayString(clock);

  if (input.status !== undefined) {
    validateStatusTransition(task.status, input.status);
  }

  if (input.dueDate !== undefined) {
    const incoming = parseCalendarDate(input.dueDate)!;
    if (incoming !== task.due_date) {
      if (compareDateStrings(incoming, today) < 0) {
        throw validationError("Request validation failed", [
          {
            field: "dueDate",
            message: `Due date cannot be earlier than ${today} (UTC)`,
          },
        ]);
      }
    }
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const setField = (col: string, val: unknown) => {
    updates.push(`${col} = $${idx}`);
    values.push(val);
    idx++;
  };

  let anyChange = false;

  if (input.title !== undefined && input.title !== task.title) {
    setField("title", input.title);
    anyChange = true;
  }
  if (
    input.description !== undefined &&
    input.description !== task.description
  ) {
    setField("description", input.description);
    anyChange = true;
  }
  if (input.priority !== undefined && input.priority !== task.priority) {
    setField("priority", input.priority);
    anyChange = true;
  }
  if (input.assignee !== undefined && input.assignee !== task.assignee) {
    setField("assignee", input.assignee);
    anyChange = true;
  }
  if (input.dueDate !== undefined) {
    const incoming = parseCalendarDate(input.dueDate)!;
    if (incoming !== task.due_date) {
      setField("due_date", incoming);
      anyChange = true;
    }
  }

  const statusChanging =
    input.status !== undefined && input.status !== task.status;

  if (statusChanging) {
    setField("status", input.status);
    anyChange = true;
  }

  if (anyChange) {
    updates.push(`updated_at = now()`);
    values.push(task.id);
    await client.query(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${idx}`,
      values,
    );
  }

  if (statusChanging) {
    await client.query(
      `INSERT INTO task_status_history (task_id, previous_status, new_status)
       VALUES ($1, $2, $3)`,
      [task.id, task.status, input.status!],
    );
  }

  const refreshed = await client.query<TaskRow>(
    "SELECT * FROM tasks WHERE id = $1",
    [task.id],
  );
  return mapTask(refreshed.rows[0]);
}