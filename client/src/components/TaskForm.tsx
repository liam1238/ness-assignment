import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError, getStatusHistory } from "../api";
import { formatStatus } from "../labels";
import type { Task, TaskPriority, TaskStatus } from "../types";

export interface TaskFormValues {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  dueDate: string;
}

interface TaskFormProps {
  mode: "create" | "edit";
  initialTask?: Task;
  isPending: boolean;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
}

function allowedStatuses(current: TaskStatus): TaskStatus[] {
  switch (current) {
    case "TODO":
      return ["TODO", "IN_PROGRESS"];
    case "IN_PROGRESS":
      return ["IN_PROGRESS", "DONE"];
    case "DONE":
      return ["DONE"];
  }
}

function statusRuleSentence(current: TaskStatus): string {
  switch (current) {
    case "TODO":
      return "From To do you may keep the status or move to In progress.";
    case "IN_PROGRESS":
      return "From In progress you may keep the status or move to Done.";
    case "DONE":
      return "Done tasks can only stay Done.";
  }
}

const defaultCreateValues: TaskFormValues = {
  title: "",
  description: "",
  status: "TODO",
  priority: "MEDIUM",
  assignee: "",
  dueDate: "",
};

function valuesFromTask(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    assignee: task.assignee ?? "",
    dueDate: task.dueDate,
  };
}

function formatChangedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function TaskForm({
  mode,
  initialTask,
  isPending,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [values, setValues] = useState<TaskFormValues>(() =>
    mode === "edit" && initialTask
      ? valuesFromTask(initialTask)
      : { ...defaultCreateValues },
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const editBaseline = initialTask?.status ?? "TODO";
  const statusOptions =
    mode === "create"
      ? (["TODO", "IN_PROGRESS", "DONE"] as const)
      : allowedStatuses(editBaseline);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isPending) {
      return;
    }
    setFormError(null);
    setFieldErrors({});
    try {
      await onSubmit(values);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.body.error.message);
        const details = err.body.error.details ?? [];
        const next: Record<string, string> = {};
        for (const d of details) {
          next[d.field] = d.message;
        }
        setFieldErrors(next);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong");
      }
    }
  }

  function update<K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open onClose={isPending ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "New task" : "Edit task"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 0 }}>
          <Stack spacing={2}>
            {formError ? (
              <Alert severity="error" data-testid="form-error" role="alert">
                {formError}
              </Alert>
            ) : null}

            <TextField
              label="Title"
              required
              fullWidth
              size="small"
              value={values.title}
              onChange={(e) => update("title", e.target.value)}
              data-testid="task-title"
              slotProps={{
                htmlInput: { maxLength: 120 },
              }}
              error={Boolean(fieldErrors.title)}
              helperText={
                fieldErrors.title ? (
                  <span data-testid="field-error-title">{fieldErrors.title}</span>
                ) : undefined
              }
            />

            <TextField
              label="Description"
              fullWidth
              size="small"
              multiline
              minRows={3}
              value={values.description}
              onChange={(e) => update("description", e.target.value)}
              data-testid="task-description"
              slotProps={{
                htmlInput: { maxLength: 2000 },
              }}
              error={Boolean(fieldErrors.description)}
              helperText={fieldErrors.description}
            />

            <FormControl fullWidth size="small" error={Boolean(fieldErrors.status)}>
              <InputLabel id="task-status-label">Status</InputLabel>
              <Select
                labelId="task-status-label"
                label="Status"
                value={values.status}
                onChange={(e) => update("status", e.target.value as TaskStatus)}
                data-testid="task-status"
              >
                {statusOptions.map((s) => (
                  <MenuItem key={s} value={s}>
                    {formatStatus(s)}
                  </MenuItem>
                ))}
              </Select>
              {mode === "edit" ? (
                <FormHelperText>{statusRuleSentence(editBaseline)}</FormHelperText>
              ) : null}
              {fieldErrors.status ? (
                <FormHelperText error>{fieldErrors.status}</FormHelperText>
              ) : null}
            </FormControl>

            <FormControl fullWidth size="small" error={Boolean(fieldErrors.priority)}>
              <InputLabel id="task-priority-label">Priority</InputLabel>
              <Select
                labelId="task-priority-label"
                label="Priority"
                value={values.priority}
                onChange={(e) =>
                  update("priority", e.target.value as TaskPriority)
                }
                data-testid="task-priority"
              >
                <MenuItem value="LOW">Low</MenuItem>
                <MenuItem value="MEDIUM">Medium</MenuItem>
                <MenuItem value="HIGH">High</MenuItem>
              </Select>
              {fieldErrors.priority ? (
                <FormHelperText error>{fieldErrors.priority}</FormHelperText>
              ) : null}
            </FormControl>

            <TextField
              label="Assignee"
              fullWidth
              size="small"
              value={values.assignee}
              onChange={(e) => update("assignee", e.target.value)}
              data-testid="task-assignee"
              slotProps={{
                htmlInput: { maxLength: 80 },
              }}
              error={Boolean(fieldErrors.assignee)}
              helperText={fieldErrors.assignee}
            />

            <TextField
              label="Due date"
              type="date"
              required={mode === "create"}
              fullWidth
              size="small"
              value={values.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
              data-testid="task-due-date"
              slotProps={{
                inputLabel: { shrink: true },
              }}
              error={Boolean(fieldErrors.dueDate)}
              helperText={
                fieldErrors.dueDate ? (
                  <span data-testid="field-error-dueDate">
                    {fieldErrors.dueDate}
                  </span>
                ) : undefined
              }
            />

            {mode === "edit" && initialTask ? (
              <StatusHistory taskId={initialTask.id} />
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            type="button"
            data-testid="task-cancel"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            data-testid="task-submit"
            disabled={isPending}
          >
            {isPending ? "Saving…" : mode === "create" ? "Create" : "Save"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function StatusHistory({ taskId }: { taskId: string }) {
  const historyQuery = useQuery({
    queryKey: ["status-history", taskId],
    queryFn: () => getStatusHistory(taskId),
  });

  return (
    <Box
      component="section"
      aria-labelledby="status-history-title"
      sx={{
        pt: 2,
        mt: 0.5,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Typography
        id="status-history-title"
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600 }}
      >
        Status history
      </Typography>
      {historyQuery.isPending ? (
        <Typography variant="body2" color="text.secondary">
          Loading history…
        </Typography>
      ) : historyQuery.isError ? (
        <Typography variant="body2" color="error">
          History could not be loaded.
        </Typography>
      ) : historyQuery.data.data.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="status-history-empty"
        >
          No status changes yet.
        </Typography>
      ) : (
        <Stack
          component="ul"
          spacing={0.75}
          data-testid="status-history"
          sx={{ listStyle: "none", m: 0, p: 0 }}
        >
          {historyQuery.data.data.map((item) => (
            <Box
              component="li"
              key={item.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2">
                {formatStatus(item.previousStatus)} to{" "}
                {formatStatus(item.newStatus)}
              </Typography>
              <Typography
                component="time"
                variant="caption"
                color="text.secondary"
                dateTime={item.changedAt}
              >
                {formatChangedAt(item.changedAt)}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}