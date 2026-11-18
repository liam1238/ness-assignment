import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import { useState, type FormEvent } from "react";
import { ApiError } from "../api";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { TaskFormFields } from "./TaskFormFields";
import { TaskImages } from "./TaskImages";

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
  onSubmit: (values: TaskFormValues, images: File[]) => Promise<void>;
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
  const [pendingImages, setPendingImages] = useState<File[]>([]);

  const editBaseline = initialTask?.status ?? "TODO";
  const statusOptions =
    mode === "create"
      ? (["TODO", "IN_PROGRESS", "DONE"] as const)
      : allowedStatuses(editBaseline);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isPending) {
      return;
    }
    setFormError(null);
    setFieldErrors({});
    try {
      await onSubmit(values, mode === "create" ? pendingImages : []);
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.body.error.message);
        const next: Record<string, string> = {};
        for (const detail of err.body.error.details ?? []) {
          next[detail.field] = detail.message;
        }
        setFieldErrors(next);
      } else if (err instanceof Error) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong");
      }
    }
  }

  return (
    <Dialog open onClose={isPending ? undefined : onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{mode === "create" ? "New task" : "Edit task"}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <DialogContent sx={{ pt: 0 }}>
          <TaskFormFields
            mode={mode}
            taskId={initialTask?.id}
            values={values}
            fieldErrors={fieldErrors}
            formError={formError}
            statusOptions={statusOptions}
            statusHint={mode === "edit" ? statusRuleSentence(editBaseline) : null}
            onChange={(key, value) =>
              setValues((prev) => ({ ...prev, [key]: value }))
            }
          />
          {mode === "edit" && initialTask ? (
            <TaskImages taskId={initialTask.id} allowUpload />
          ) : (
            <TaskImages
              allowUpload
              pendingFiles={pendingImages}
              onPendingFilesChange={setPendingImages}
            />
          )}
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
