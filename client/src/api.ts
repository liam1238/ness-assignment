import type {
  CreateTaskPayload,
  ErrorBody,
  ListTasksParams,
  StatusHistoryResponse,
  Task,
  TaskListResponse,
  UpdateTaskPayload,
} from "./types";

export class ApiError extends Error {
  readonly status: number;
  readonly body: ErrorBody;

  constructor(status: number, body: ErrorBody) {
    super(body.error.message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

async function parseErrorResponse(res: Response): Promise<ErrorBody> {
  try {
    const data = (await res.json()) as ErrorBody;
    if (data?.error?.message) {
      return data;
    }
  } catch {
    /* fall through */
  }
  return {
    error: {
      code: "UNKNOWN",
      message: res.statusText || "Request failed",
    },
  };
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
): Promise<{ res: Response; data: T }> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await parseErrorResponse(res);
    throw new ApiError(res.status, body);
  }

  const data = (await res.json()) as T;
  return { res, data };
}

export function buildListQuery(params: ListTasksParams): string {
  const search = new URLSearchParams();

  if (params.status) {
    search.set("status", params.status);
  }
  if (params.priority) {
    search.set("priority", params.priority);
  }
  const q = params.q?.trim();
  if (q) {
    search.set("q", q);
  }
  if (params.sort) {
    search.set("sort", params.sort);
  }
  if (params.order) {
    search.set("order", params.order);
  }
  if (params.page !== undefined && params.page > 0) {
    search.set("page", String(params.page));
  }
  const pageSize = params.pageSize ?? 20;
  search.set("pageSize", String(pageSize));

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function listTasks(
  params: ListTasksParams,
): Promise<TaskListResponse> {
  const qs = buildListQuery(params);
  const { data } = await requestJson<TaskListResponse>(`/api/tasks${qs}`);
  return data;
}

export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const { data } = await requestJson<Task>("/api/tasks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function updateTask(
  id: string,
  payload: UpdateTaskPayload,
): Promise<Task> {
  const { data } = await requestJson<Task>(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return data;
}

export async function getStatusHistory(
  id: string,
): Promise<StatusHistoryResponse> {
  const { data } = await requestJson<StatusHistoryResponse>(
    `/api/tasks/${id}/status-history`,
  );
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await parseErrorResponse(res);
    throw new ApiError(res.status, body);
  }
  if (res.status !== 204) {
    throw new Error(`Expected 204, got ${res.status}`);
  }
}