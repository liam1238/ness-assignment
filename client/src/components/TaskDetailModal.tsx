import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiError, getTask } from "../api";
import { PriorityChip, StatusChip } from "./StatusPriorityChips";
import { StatusHistory } from "./StatusHistory";
import { TaskComments } from "./TaskComments";
import { TaskImages } from "./TaskImages";

function formatTimestamp(iso: string): string {
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

function DetailField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 0.25, fontWeight: 500 }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const taskQuery = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
  });

  const errorMessage = taskQuery.isError
    ? taskQuery.error instanceof ApiError
      ? taskQuery.error.body.error.message
      : taskQuery.error instanceof Error
        ? taskQuery.error.message
        : "Failed to load task"
    : null;

  const task = taskQuery.data;

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      data-testid="task-detail"
    >
      {taskQuery.isPending ? (
        <DialogTitle>Loading…</DialogTitle>
      ) : taskQuery.isError ? (
        <DialogTitle>Task details</DialogTitle>
      ) : task ? (
        <DialogTitle data-testid="task-detail-title">{task.title}</DialogTitle>
      ) : (
        <DialogTitle>Task details</DialogTitle>
      )}

      <DialogContent sx={{ pt: 1, pb: 0 }}>
        {taskQuery.isPending ? (
          <Typography variant="body2" color="text.secondary">
            Loading task…
          </Typography>
        ) : taskQuery.isError ? (
          <Typography
            variant="body2"
            color="error"
            data-testid="task-detail-error"
          >
            {errorMessage}
          </Typography>
        ) : task ? (
          <Stack spacing={2.5}>
            <DetailField label="Description">
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {task.description ?? "No description"}
              </Typography>
            </DetailField>

            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
              <DetailField label="Status">
                <StatusChip status={task.status} />
              </DetailField>
              <DetailField label="Priority">
                <PriorityChip priority={task.priority} />
              </DetailField>
            </Stack>

            <DetailField label="Assignee">
              <Typography variant="body2">
                {task.assignee ?? "Unassigned"}
              </Typography>
            </DetailField>

            <DetailField label="Due date">
              <Typography variant="body2">{task.dueDate}</Typography>
            </DetailField>

            <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: "wrap" }}>
              <DetailField label="Created">
                <Typography variant="body2" color="text.secondary">
                  {formatTimestamp(task.createdAt)}
                </Typography>
              </DetailField>
              <DetailField label="Updated">
                <Typography variant="body2" color="text.secondary">
                  {formatTimestamp(task.updatedAt)}
                </Typography>
              </DetailField>
            </Stack>

            <StatusHistory taskId={task.id} />
            <TaskImages taskId={task.id} />
            <TaskComments taskId={task.id} />
          </Stack>
        ) : null}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
        <Button onClick={onClose} data-testid="task-detail-close">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}