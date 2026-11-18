import { ApiError } from "./api";
import type { ErrorBody } from "./types";

export interface TaskImage {
  id: string;
  taskId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
}

export interface TaskImagesResponse {
  data: TaskImage[];
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
  const res = await fetch(path, init);

  if (!res.ok) {
    const body = await parseErrorResponse(res);
    throw new ApiError(res.status, body);
  }

  const data = (await res.json()) as T;
  return { res, data };
}

export async function listImages(
  taskId: string,
): Promise<TaskImagesResponse> {
  const { data } = await requestJson<TaskImagesResponse>(
    `/api/tasks/${taskId}/images`,
  );
  return data;
}

export async function uploadImage(
  taskId: string,
  file: File,
): Promise<TaskImage> {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(`/api/tasks/${taskId}/images`, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const body = await parseErrorResponse(res);
    throw new ApiError(res.status, body);
  }

  return (await res.json()) as TaskImage;
}