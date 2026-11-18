import type { TaskPriority, TaskStatus } from "./types";

export function formatStatus(status: TaskStatus): string {
  switch (status) {
    case "TODO":
      return "To do";
    case "IN_PROGRESS":
      return "In progress";
    case "DONE":
      return "Done";
  }
}

export function formatPriority(priority: TaskPriority): string {
  switch (priority) {
    case "LOW":
      return "Low";
    case "MEDIUM":
      return "Medium";
    case "HIGH":
      return "High";
  }
}