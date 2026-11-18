import AddIcon from "@mui/icons-material/Add";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createTask,
  deleteTask,
  listTasks,
  updateTask,
} from "./api";
import { DeleteConfirm } from "./components/DeleteConfirm";
import {
  TaskFilters,
  type PriorityFilter,
  type StatusFilter,
} from "./components/TaskFilters";
import { TaskForm, type TaskFormValues } from "./components/TaskForm";
import { TaskListSkeleton } from "./components/TaskListSkeleton";
import { TaskTable } from "./components/TaskTable";
import type {
  ListTasksParams,
  SortField,
  SortOrder,
  Task,
  UpdateTaskPayload,
} from "./types";

const PAGE_SIZE = 10;
const TASKS_QUERY_KEY = "tasks";

function buildPatch(task: Task, values: TaskFormValues): UpdateTaskPayload {
  const payload: UpdateTaskPayload = {};
  const title = values.title.trim();
  if (title !== task.title) {
    payload.title = title;
  }
  if (values.status !== task.status) {
    payload.status = values.status;
  }
  if (values.priority !== task.priority) {
    payload.priority = values.priority;
  }
  if (values.dueDate !== task.dueDate) {
    payload.dueDate = values.dueDate;
  }
  const description = values.description.trim() || null;
  if (description !== task.description) {
    payload.description = description;
  }
  const assignee = values.assignee.trim() || null;
  if (assignee !== task.assignee) {
    payload.assignee = assignee;
  }
  return payload;
}

export default function App() {
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
      setFormMode(null);
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
      setFormMode(null);
      setEditingTask(null);
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
        setMutationError(
          err instanceof Error ? err.message : "Delete failed",
        );
      }
    },
  });

  function handleSearchInputChange(value: string) {
    setSearchInput(value);
  }

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

  async function handleFormSubmit(values: TaskFormValues) {
    if (formMode === "create") {
      await createMutation.mutateAsync({
        title: values.title.trim(),
        dueDate: values.dueDate,
        status: values.status,
        priority: values.priority,
        description: values.description.trim() || null,
        assignee: values.assignee.trim() || null,
      });
      return;
    }
    if (formMode === "edit" && editingTask) {
      const payload = buildPatch(editingTask, values);
      await updateMutation.mutateAsync({ id: editingTask.id, payload });
    }
  }

  const formPending = createMutation.isPending || updateMutation.isPending;

  const totalPages = tasksQuery.data?.totalPages ?? 0;
  const currentPage = tasksQuery.data?.page ?? page;
  const total = tasksQuery.data?.total ?? 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: "background.paper",
          color: "text.primary",
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
          <Toolbar disableGutters sx={{ minHeight: 56, gap: 2 }}>
            <Typography variant="h1" component="h1" sx={{ flexGrow: 1 }}>
              Team tasks
            </Typography>
            <Button
              variant="contained"
              size="medium"
              startIcon={<AddIcon fontSize="small" />}
              data-testid="open-create"
              onClick={openCreate}
            >
              New task
            </Button>
          </Toolbar>
        </Container>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {mutationError && !formMode && !deletingTask ? (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="request-error" role="alert">
            {mutationError}
          </Alert>
        ) : null}

        {listError ? (
          <Alert severity="error" sx={{ mb: 2 }} data-testid="request-error" role="alert">
            {listError}
          </Alert>
        ) : null}

        <Paper
          variant="outlined"
          component="section"
          aria-label="Task list"
          sx={{
            p: { xs: 2, sm: 2.5 },
            borderRadius: "12px",
            borderColor: "divider",
          }}
        >
          <TaskFilters
            searchInput={searchInput}
            onSearchInputChange={handleSearchInputChange}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={handlePriorityFilterChange}
            sortField={sortField}
            onSortFieldChange={handleSortFieldChange}
            sortOrder={sortOrder}
            onSortOrderChange={handleSortOrderChange}
          />

          {tasksQuery.isPending ? (
            <TaskListSkeleton />
          ) : tasksQuery.isError ? null : tasksQuery.data?.data.length === 0 ? (
            <Box
              sx={{ py: 5, textAlign: "center" }}
              data-testid="empty-state"
            >
              <Typography color="text.secondary">
                {hasActiveFilters
                  ? "No tasks match these filters."
                  : "No tasks yet."}
              </Typography>
            </Box>
          ) : tasksQuery.data ? (
            <TaskTable
              tasks={tasksQuery.data.data}
              onEdit={openEdit}
              onDelete={(task) => {
                setMutationError(null);
                setDeletingTask(task);
              }}
            />
          ) : null}

          {!tasksQuery.isPending && !tasksQuery.isError ? (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                mt: 2.5,
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                size="small"
                variant="outlined"
                data-testid="page-prev"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Typography
                variant="body2"
                color="text.secondary"
                data-testid="page-status"
                sx={{ px: 0.5 }}
              >
                Page {currentPage}
                {totalPages > 0 ? ` of ${totalPages}` : ""} ({total} tasks)
              </Typography>
              <Button
                size="small"
                variant="outlined"
                data-testid="page-next"
                disabled={totalPages === 0 || currentPage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Stack>
          ) : null}
        </Paper>
      </Container>

      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSuccessMessage(null)}
          severity="success"
          variant="filled"
          data-testid="success-status"
          role="status"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>

      {formMode ? (
        <TaskForm
          mode={formMode}
          initialTask={editingTask ?? undefined}
          isPending={formPending}
          onSubmit={handleFormSubmit}
          onCancel={() => {
            setFormMode(null);
            setEditingTask(null);
          }}
        />
      ) : null}

      {deletingTask ? (
        <DeleteConfirm
          task={deletingTask}
          isPending={deleteMutation.isPending}
          onConfirm={() => void deleteMutation.mutate(deletingTask.id)}
          onCancel={() => setDeletingTask(null)}
        />
      ) : null}
    </Box>
  );
}