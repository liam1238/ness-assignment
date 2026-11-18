import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "./api";
import { uploadImage } from "./imagesApi";
import { buildPatch } from "./buildPatch";
import type { PriorityFilter, StatusFilter } from "./components/TaskFilters";
import type { TaskFormValues } from "./components/TaskForm";
import type {
  ListTasksParams,
  SortField,
  SortOrder,
  Task,
  UpdateTaskPayload,
} from "./types";

const PAGE_SIZE = 10;
const TASKS_QUERY_KEY = "tasks";

export function useTaskBoard() {
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage] = useState(1);

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = searchInput.trim();
      setQ((prev) => {
        if (prev !== nextQ) {
          setPage(1);
        }
        return nextQ;
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const listParams: ListTasksParams = useMemo(() => {
    const params: ListTasksParams = {
      sort: sortField,
      order: sortOrder,
      page,
      pageSize: PAGE_SIZE,
    };
    if (statusFilter !== "all") {
      params.status = statusFilter;
    }
    if (priorityFilter !== "all") {
      params.priority = priorityFilter;
    }
    if (q) {
      params.q = q;
    }
    return params;
  }, [statusFilter, priorityFilter, q, sortField, sortOrder, page]);

  const listQueryKey = useMemo(
    () => [TASKS_QUERY_KEY, listParams] as const,
    [listParams],
  );

  const tasksQuery = useQuery({
    queryKey: listQueryKey,
    queryFn: () => listTasks(listParams),
  });

  useEffect(() => {
    if (tasksQuery.isError) {
      const err = tasksQuery.error;
      if (err instanceof ApiError) {
        setListError(err.body.error.message);
      } else if (err instanceof Error) {
        setListError(err.message);
      } else {
        setListError("Failed to load tasks");
      }
    } else {
      setListError(null);
    }
  }, [tasksQuery.isError, tasksQuery.error]);

  const hasActiveFilters =
    statusFilter !== "all" || priorityFilter !== "all" || q.length > 0;

  const invalidateList = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      setSuccessMessage("Task created");
      setMutationError(null);
      invalidateList();
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        throw err;
      }
      setMutationError(err instanceof Error ? err.message : "Create failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      updateTask(id, payload),
    onSuccess: (_task, variables) => {
      setSuccessMessage("Task updated");
      setMutationError(null);
      invalidateList();
      void queryClient.invalidateQueries({
        queryKey: ["status-history", variables.id],
      });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        throw err;
      }
      setMutationError(err instanceof Error ? err.message : "Update failed");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: async () => {
      setSuccessMessage("Task deleted");
      setMutationError(null);
      setDeletingTask(null);
      await queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] });
      const refreshed = await queryClient.fetchQuery({
        queryKey: listQueryKey,
        queryFn: () => listTasks(listParams),
      });
      if (refreshed.data.length === 0 && refreshed.page > 1) {
        setPage(refreshed.page - 1);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setMutationError(err.body.error.message);
      } else {
        setMutationError(err instanceof Error ? err.message : "Delete failed");
      }
    },
  });

  function handleStatusFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePriorityFilterChange(value: PriorityFilter) {
    setPriorityFilter(value);
    setPage(1);
  }

  function handleSortFieldChange(value: SortField) {
    setSortField(value);
    setPage(1);
  }

  function handleSortOrderChange(value: SortOrder) {
    setSortOrder(value);
    setPage(1);
  }

  function openCreate() {
    setMutationError(null);
    setEditingTask(null);
    setFormMode("create");
  }

  function openEdit(task: Task) {
    setMutationError(null);
    setEditingTask(task);
    setFormMode("edit");
  }

  function openDetail(id: string) {
    setDetailTaskId(id);
  }

  function closeDetail() {
    setDetailTaskId(null);
  }

  async function uploadPendingImages(taskId: string, images: File[]) {
    const failed: string[] = [];
    for (const file of images) {
      try {
        await uploadImage(taskId, file);
      } catch {
        failed.push(file.name);
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["task-images", taskId] });
    if (failed.length > 0) {
      setMutationError(
        `Saved the task, but could not upload: ${failed.join(", ")}`,
      );
    }
  }

  async function handleFormSubmit(values: TaskFormValues, images: File[] = []) {
    if (formMode === "create") {
      const created = await createMutation.mutateAsync({
        title: values.title.trim(),
        dueDate: values.dueDate,
        status: values.status,
        priority: values.priority,
        description: values.description.trim() || null,
        assignee: values.assignee.trim() || null,
      });
      await uploadPendingImages(created.id, images);
      setFormMode(null);
      return;
    }
    if (formMode === "edit" && editingTask) {
      const payload = buildPatch(editingTask, values);
      await updateMutation.mutateAsync({ id: editingTask.id, payload });
      setFormMode(null);
      setEditingTask(null);
    }
  }

  return {
    searchInput,
    setSearchInput,
    statusFilter,
    priorityFilter,
    sortField,
    sortOrder,
    page,
    setPage,
    formMode,
    setFormMode,
    editingTask,
    setEditingTask,
    deletingTask,
    setDeletingTask,
    successMessage,
    setSuccessMessage,
    listError,
    mutationError,
    setMutationError,
    hasActiveFilters,
    tasksQuery,
    deleteMutation,
    formPending: createMutation.isPending || updateMutation.isPending,
    totalPages: tasksQuery.data?.totalPages ?? 0,
    currentPage: tasksQuery.data?.page ?? page,
    total: tasksQuery.data?.total ?? 0,
    handleStatusFilterChange,
    handlePriorityFilterChange,
    handleSortFieldChange,
    handleSortOrderChange,
    openCreate,
    openEdit,
    openDetail,
    closeDetail,
    detailTaskId,
    handleFormSubmit,
  };
}
