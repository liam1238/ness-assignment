import Chip from "@mui/material/Chip";
import type { TaskPriority, TaskStatus } from "../types";
import { formatPriority, formatStatus } from "../labels";

const statusSx = (status: TaskStatus) => {
  switch (status) {
    case "TODO":
      return {
        bgcolor: "#f8fafc",
        color: "#334155",
        borderColor: "rgba(15, 23, 42, 0.12)",
      };
    case "IN_PROGRESS":
      return {
        bgcolor: "#eff6ff",
        color: "#1e40af",
        borderColor: "rgba(30, 64, 175, 0.22)",
      };
    case "DONE":
      return {
        bgcolor: "#f0fdf4",
        color: "#166534",
        borderColor: "rgba(22, 101, 52, 0.2)",
      };
  }
};

const prioritySx = (priority: TaskPriority) => {
  switch (priority) {
    case "LOW":
      return { bgcolor: "#f8fafc", color: "#64748b" };
    case "MEDIUM":
      return { bgcolor: "#fff7ed", color: "#9a3412" };
    case "HIGH":
      return { bgcolor: "#fef2f2", color: "#991b1b" };
  }
};

export function StatusChip({ status }: { status: TaskStatus }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={formatStatus(status)}
      sx={statusSx(status)}
    />
  );
}

export function PriorityChip({ priority }: { priority: TaskPriority }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      label={formatPriority(priority)}
      sx={prioritySx(priority)}
    />
  );
}