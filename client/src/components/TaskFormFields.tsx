import Alert from "@mui/material/Alert";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { formatStatus } from "../labels";
import type { TaskPriority, TaskStatus } from "../types";
import { StatusHistory } from "./StatusHistory";
import type { TaskFormValues } from "./TaskForm";

interface TaskFormFieldsProps {
  mode: "create" | "edit";
  taskId?: string;
  values: TaskFormValues;
  fieldErrors: Record<string, string>;
  formError: string | null;
  statusOptions: readonly TaskStatus[];
  statusHint: string | null;
  onChange: <K extends keyof TaskFormValues>(
    key: K,
    value: TaskFormValues[K],
  ) => void;
}

export function TaskFormFields({
  mode,
  taskId,
  values,
  fieldErrors,
  formError,
  statusOptions,
  statusHint,
  onChange,
}: TaskFormFieldsProps) {
  return (
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
        onChange={(e) => onChange("title", e.target.value)}
        data-testid="task-title"
        slotProps={{ htmlInput: { maxLength: 120 } }}
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
        onChange={(e) => onChange("description", e.target.value)}
        data-testid="task-description"
        slotProps={{ htmlInput: { maxLength: 2000 } }}
        error={Boolean(fieldErrors.description)}
        helperText={fieldErrors.description}
      />

      <FormControl fullWidth size="small" error={Boolean(fieldErrors.status)}>
        <InputLabel id="task-status-label">Status</InputLabel>
        <Select
          labelId="task-status-label"
          label="Status"
          value={values.status}
          onChange={(e) => onChange("status", e.target.value as TaskStatus)}
          data-testid="task-status"
        >
          {statusOptions.map((status) => (
            <MenuItem key={status} value={status}>
              {formatStatus(status)}
            </MenuItem>
          ))}
        </Select>
        {statusHint ? <FormHelperText>{statusHint}</FormHelperText> : null}
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
          onChange={(e) => onChange("priority", e.target.value as TaskPriority)}
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
        onChange={(e) => onChange("assignee", e.target.value)}
        data-testid="task-assignee"
        slotProps={{ htmlInput: { maxLength: 80 } }}
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
        onChange={(e) => onChange("dueDate", e.target.value)}
        data-testid="task-due-date"
        slotProps={{ inputLabel: { shrink: true } }}
        error={Boolean(fieldErrors.dueDate)}
        helperText={
          fieldErrors.dueDate ? (
            <span data-testid="field-error-dueDate">{fieldErrors.dueDate}</span>
          ) : undefined
        }
      />

      {mode === "edit" && taskId ? <StatusHistory taskId={taskId} /> : null}
    </Stack>
  );
}
