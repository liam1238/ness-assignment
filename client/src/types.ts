export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";
export type SortField = "dueDate" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskListResponse {
  data: Task[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface StatusHistoryItem {
  id: string;
  taskId: string;
  previousStatus: TaskStatus;
  newStatus: TaskStatus;
  changedAt: string;
}

export interface StatusHistoryResponse {
  data: StatusHistoryItem[];
}

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
  };
}

export interface ListTasksParams {
  status?: TaskStatus;
  priority?: TaskPriority;
  q?: string;
  sort?: SortField;
  order?: SortOrder;
  page?: number;
  pageSize?: number;
}

export type CreateTaskPayload = {
  title: string;
  dueDate: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  description?: string | null;
  assignee?: string | null;
};

export type UpdateTaskPayload = Partial<{
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  description: string | null;
  assignee: string | null;
}>;