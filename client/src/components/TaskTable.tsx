import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import type { KeyboardEvent } from "react";
import type { Task } from "../types";
import { TaskCardList } from "./TaskCardList";
import { PriorityChip, StatusChip } from "./StatusPriorityChips";

interface TaskTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
}

function handleRowKeyDown(
  event: KeyboardEvent<HTMLTableRowElement>,
  task: Task,
  onOpen: (task: Task) => void,
) {
  if (event.key === "Enter" && event.target === event.currentTarget) {
    event.preventDefault();
    onOpen(task);
  }
}

export function TaskTable({ tasks, onEdit, onDelete, onOpen }: TaskTableProps) {
  return (
    <>
      <TableContainer component={Box} className="task-table-desktop">
        <Table size="small" aria-label="Tasks">
          <TableHead>
            <TableRow>
              <TableCell scope="col">Title</TableCell>
              <TableCell scope="col">Status</TableCell>
              <TableCell scope="col">Priority</TableCell>
              <TableCell scope="col">Assignee</TableCell>
              <TableCell scope="col">Due date</TableCell>
              <TableCell scope="col" align="right">
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                data-testid="task-row"
                hover
                tabIndex={0}
                onClick={() => onOpen(task)}
                onKeyDown={(event) => handleRowKeyDown(event, task, onOpen)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell
                  sx={{
                    fontWeight: 500,
                    maxWidth: 280,
                    wordBreak: "break-word",
                  }}
                >
                  {task.title}
                </TableCell>
                <TableCell>
                  <StatusChip status={task.status} />
                </TableCell>
                <TableCell>
                  <PriorityChip priority={task.priority} />
                </TableCell>
                <TableCell sx={{ color: "text.secondary" }}>
                  {task.assignee ?? "—"}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{task.dueDate}</TableCell>
                <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ justifyContent: "flex-end" }}
                  >
                    <Button
                      size="small"
                      variant="text"
                      data-testid="edit-task"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      data-testid="delete-task"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task);
                      }}
                    >
                      Delete
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TaskCardList
        tasks={tasks}
        onEdit={onEdit}
        onDelete={onDelete}
        onOpen={onOpen}
      />
    </>
  );
}