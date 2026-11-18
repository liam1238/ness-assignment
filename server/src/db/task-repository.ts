import type { Pool, PoolClient } from "pg";
import { buildTitleSearchPattern } from "../domain/like";

export type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH";
  assignee: string | null;
  due_date: string;
  created_at: Date;
  updated_at: Date;
};

export type HistoryRow = {
  id: string;
  task_id: string;
  previous_status: string;
  new_status: string;
  changed_at: Date;
};

export type TaskDto = {
  id: string;
  title: string;
  description: string | null;
  status: TaskRow["status"];
  priority: TaskRow["priority"];
  assignee: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
};

export type HistoryDto = {
  id: string;
  taskId: string;
  previousStatus: string;
  newStatus: string;
  changedAt: string;
};

export function mapTask(row: TaskRow): TaskDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    dueDate: row.due_date,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export function mapHistory(row: HistoryRow): HistoryDto {
  return {
    id: row.id,
    taskId: row.task_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    changedAt: row.changed_at.toISOString(),
  };
}

export type ListFilters = {
  status?: "TODO" | "IN_PROGRESS" | "DONE";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  q?: string;
  sort: "dueDate" | "createdAt";
  order: "asc" | "desc";
  page: number;
  pageSize: number;
};

export class TaskRepository {
  constructor(private readonly pool: Pool) {}

  async insertTask(
    fields: {
      title: string;
      description: string | null;
      status: TaskRow["status"];
      priority: TaskRow["priority"];
      assignee: string | null;
      due_date: string;
    },
  ): Promise<TaskRow> {
    const result = await this.pool.query<TaskRow>(
      `INSERT INTO tasks (title, description, status, priority, assignee, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        fields.title,
        fields.description,
        fields.status,
        fields.priority,
        fields.assignee,
        fields.due_date,
      ],
    );
    return result.rows[0];
  }

  async getById(id: string): Promise<TaskRow | null> {
    const result = await this.pool.query<TaskRow>(
      "SELECT * FROM tasks WHERE id = $1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.pool.query(
      "DELETE FROM tasks WHERE id = $1",
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async list(filters: ListFilters): Promise<{ rows: TaskRow[]; total: number }> {
    const { where, params } = this.buildWhere(filters);
    const orderSql = this.buildOrderBy(filters);
    const offset = (filters.page - 1) * filters.pageSize;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM tasks ${where}`,
      params,
    );
    const total = Number(countResult.rows[0].count);

    const listParams = [...params, filters.pageSize, offset];
    const limitIdx = params.length + 1;
    const offsetIdx = params.length + 2;

    const result = await this.pool.query<TaskRow>(
      `SELECT * FROM tasks ${where}
       ORDER BY ${orderSql}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    return { rows: result.rows, total };
  }

  private buildWhere(filters: ListFilters): {
    where: string;
    params: unknown[];
  } {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (filters.status) {
      params.push(filters.status);
      clauses.push(`status = $${params.length}`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      clauses.push(`priority = $${params.length}`);
    }
    const q = filters.q?.trim();
    if (q) {
      params.push(buildTitleSearchPattern(q));
      clauses.push(`title ILIKE $${params.length} ESCAPE '\\'`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    return { where, params };
  }

  private buildOrderBy(filters: ListFilters): string {
    const dir = filters.order === "desc" ? "DESC" : "ASC";
    if (filters.sort === "createdAt") {
      return `created_at ${dir}, id ASC`;
    }
    return `due_date ${dir}, created_at ASC, id ASC`;
  }

  async getHistory(taskId: string): Promise<HistoryRow[]> {
    const result = await this.pool.query<HistoryRow>(
      `SELECT * FROM task_status_history
       WHERE task_id = $1
       ORDER BY changed_at ASC, id ASC`,
      [taskId],
    );
    return result.rows;
  }

  async countHistoryForTask(taskId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_status_history WHERE task_id = $1`,
      [taskId],
    );
    return Number(result.rows[0].count);
  }

  async withLockedTask<T>(
    id: string,
    fn: (client: PoolClient, task: TaskRow) => Promise<T>,
  ): Promise<T | null> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const locked = await client.query<TaskRow>(
        "SELECT * FROM tasks WHERE id = $1 FOR UPDATE",
        [id],
      );
      const task = locked.rows[0];
      if (!task) {
        await client.query("ROLLBACK");
        return null;
      }
      const out = await fn(client, task);
      await client.query("COMMIT");
      return out;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }
}