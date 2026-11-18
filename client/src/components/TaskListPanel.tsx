import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import {
  TaskFilters,
  type PriorityFilter,
  type StatusFilter,
} from "./TaskFilters";
import { TaskListSkeleton } from "./TaskListSkeleton";
import { TaskPagination } from "./TaskPagination";
import { TaskTable } from "./TaskTable";
import type { SortField, SortOrder, Task } from "../types";

interface TaskListPanelProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  priorityFilter: PriorityFilter;
  onPriorityFilterChange: (value: PriorityFilter) => void;
  sortField: SortField;
  onSortFieldChange: (value: SortField) => void;
  sortOrder: SortOrder;
  onSortOrderChange: (value: SortOrder) => void;
  isPending: boolean;
  isError: boolean;
  tasks: Task[];
  hasActiveFilters: boolean;
  showPagination: boolean;
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onOpen: (task: Task) => void;
}

export function TaskListPanel({
  searchInput,
  onSearchInputChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sortField,
  onSortFieldChange,
  sortOrder,
  onSortOrderChange,
  isPending,
  isError,
  tasks,
  hasActiveFilters,
  showPagination,
  currentPage,
  totalPages,
  total,
  onPageChange,
  onEdit,
  onDelete,
  onOpen,
}: TaskListPanelProps) {
  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Task list"
      sx={{
        p: { xs: 2, sm: 2.5 },
        borderRadius: "12px",
        borderColor: "divider",
      }}
    >
      <TaskFilters
        searchInput={searchInput}
        onSearchInputChange={onSearchInputChange}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        priorityFilter={priorityFilter}
        onPriorityFilterChange={onPriorityFilterChange}
        sortField={sortField}
        onSortFieldChange={onSortFieldChange}
        sortOrder={sortOrder}
        onSortOrderChange={onSortOrderChange}
      />

      {isPending ? (
        <TaskListSkeleton />
      ) : isError ? null : tasks.length === 0 ? (
        <Box sx={{ py: 5, textAlign: "center" }} data-testid="empty-state">
          <Typography color="text.secondary">
            {hasActiveFilters
              ? "No tasks match these filters."
              : "No tasks yet."}
          </Typography>
        </Box>
      ) : (
        <TaskTable
          tasks={tasks}
          onEdit={onEdit}
          onDelete={onDelete}
          onOpen={onOpen}
        />
      )}

      {showPagination ? (
        <TaskPagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          onPageChange={onPageChange}
        />
      ) : null}
    </Paper>
  );
}
