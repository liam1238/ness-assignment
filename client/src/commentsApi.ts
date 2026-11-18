import { ApiError } from "./api";
import type { ErrorBody } from "./types";

export interface TaskComment {
  id: string;
  taskId: string;
  body: string;
  author: string | null;
  createdAt: string;
}

export interface TaskCommentsResponse {
  data: TaskComment[];
}

export type CreateCommentPayload = {
  body: string;
  author?: string | null;
};

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

export async function listComments(
  taskId: string,
): Promise<TaskCommentsResponse> {
  const { data } = await requestJson<TaskCommentsResponse>(
    `/api/tasks/${taskId}/comments`,
  );
  return data;
}

export async function createComment(
  taskId: string,
  input: CreateCommentPayload,
): Promise<TaskComment> {
  const { data } = await requestJson<TaskComment>(
    `/api/tasks/${taskId}/comments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return data;
}