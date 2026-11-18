import type { Task, UpdateTaskPayload } from "./types";
import type { TaskFormValues } from "./components/TaskForm";

export function buildPatch(task: Task, values: TaskFormValues): UpdateTaskPayload {
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