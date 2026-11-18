import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { KeyboardEvent } from "react";
import type { Task } from "../types";
import { PriorityChip, StatusChip } from "./StatusPriorityChips";

interface TaskCardListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
}

function handleCardKeyDown(
  event: KeyboardEvent<HTMLDivElement>,
  task: Task,
  onOpen: (task: Task) => void,
) {
  if (event.key === "Enter" && event.target === event.currentTarget) {
    event.preventDefault();
    onOpen(task);
  }
}

export function TaskCardList({
  tasks,
  onEdit,
  onDelete,
  onOpen,
}: TaskCardListProps) {
  return (
    <Stack spacing={1.5} className="task-cards-mobile">
      {tasks.map((task) => (
        <Paper
          key={task.id}
          variant="outlined"
          data-testid="task-row"
          className="task-card-row"
          sx={{
            p: 1.5,
            borderRadius: "11px",
            borderColor: "divider",
          }}
        >
          <Box
            tabIndex={0}
            onClick={() => onOpen(task)}
            onKeyDown={(event) => handleCardKeyDown(event, task, onOpen)}
            sx={{ cursor: "pointer", mb: 1 }}
          >
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
              {task.title}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              useFlexGap
              sx={{ mb: 1, flexWrap: "wrap" }}
            >
              <StatusChip status={task.status} />
              <PriorityChip priority={task.priority} />
            </Stack>
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block" }}
              >
                Due {task.dueDate}
              </Typography>
              {task.assignee ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block" }}
                >
                  {task.assignee}
                </Typography>
              ) : null}
            </Box>
          </Box>
          <Stack
            direction="row"
            spacing={1}
            sx={{
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <Stack direction="row" spacing={0.5}>
              <Button
                size="small"
                variant="outlined"
                data-testid="edit-task"
                onClick={() => onEdit(task)}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                data-testid="delete-task"
                onClick={() => onDelete(task)}
              >
                Delete
              </Button>
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}