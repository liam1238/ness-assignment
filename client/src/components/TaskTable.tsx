import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { Task } from "../types";
import { PriorityChip, StatusChip } from "./StatusPriorityChips";

interface TaskTableProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskTable({ tasks, onEdit, onDelete }: TaskTableProps) {
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
              <TableRow key={task.id} data-testid="task-row" hover>
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
                <TableCell align="right">
                  <Stack
                    direction="row"
                    spacing={0.5}
                    sx={{ justifyContent: "flex-end" }}
                  >
                    <Button
                      size="small"
                      variant="text"
                      data-testid="edit-task"
                      onClick={() => onEdit(task)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="error"
                      data-testid="delete-task"
                      onClick={() => onDelete(task)}
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
            <Stack
              direction="row"
              spacing={1}
              sx={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
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
    </>
  );
}