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

export type CommentRow = {
  id: string;
  task_id: string;
  body: string;
  author: string | null;
  created_at: Date;
};

export type CommentDto = {
  id: string;
  taskId: string;
  body: string;
  author: string | null;
  createdAt: string;
};

export type TaskImageRow = {
  id: string;
  task_id: string;
  stored_name: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: Date;
};

export type TaskImageDto = {
  id: string;
  taskId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
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

export function mapComment(row: CommentRow): CommentDto {
  return {
    id: row.id,
    taskId: row.task_id,
    body: row.body,
    author: row.author,
    createdAt: row.created_at.toISOString(),
  };
}

export function mapTaskImage(row: TaskImageRow): Omit<TaskImageDto, "url"> {
  return {
    id: row.id,
    taskId: row.task_id,
    originalName: row.original_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at.toISOString(),
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

  async listComments(taskId: string): Promise<CommentRow[]> {
    const result = await this.pool.query<CommentRow>(
      `SELECT * FROM task_comments
       WHERE task_id = $1
       ORDER BY created_at ASC, id ASC`,
      [taskId],
    );
    return result.rows;
  }

  async insertComment(fields: {
    task_id: string;
    body: string;
    author: string | null;
  }): Promise<CommentRow> {
    const result = await this.pool.query<CommentRow>(
      `INSERT INTO task_comments (task_id, body, author)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [fields.task_id, fields.body, fields.author],
    );
    return result.rows[0];
  }

  async countCommentsForTask(taskId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_comments WHERE task_id = $1`,
      [taskId],
    );
    return Number(result.rows[0].count);
  }

  async listImages(taskId: string): Promise<TaskImageRow[]> {
    const result = await this.pool.query<TaskImageRow>(
      `SELECT * FROM task_images
       WHERE task_id = $1
       ORDER BY created_at ASC, id ASC`,
      [taskId],
    );
    return result.rows;
  }

  async getImageById(
    taskId: string,
    imageId: string,
  ): Promise<TaskImageRow | null> {
    const result = await this.pool.query<TaskImageRow>(
      `SELECT * FROM task_images WHERE task_id = $1 AND id = $2`,
      [taskId, imageId],
    );
    return result.rows[0] ?? null;
  }

  async insertImage(fields: {
    task_id: string;
    stored_name: string;
    original_name: string;
    mime_type: string;
    size_bytes: number;
  }): Promise<TaskImageRow> {
    const result = await this.pool.query<TaskImageRow>(
      `INSERT INTO task_images (task_id, stored_name, original_name, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        fields.task_id,
        fields.stored_name,
        fields.original_name,
        fields.mime_type,
        fields.size_bytes,
      ],
    );
    return result.rows[0];
  }

  async countImagesForTask(taskId: string): Promise<number> {
    const result = await this.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_images WHERE task_id = $1`,
      [taskId],
    );
    return Number(result.rows[0].count);
  }

  async listStoredNamesForTask(taskId: string): Promise<string[]> {
    const result = await this.pool.query<{ stored_name: string }>(
      `SELECT stored_name FROM task_images WHERE task_id = $1`,
      [taskId],
    );
    return result.rows.map((r) => r.stored_name);
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