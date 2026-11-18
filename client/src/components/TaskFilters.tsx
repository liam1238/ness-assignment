import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import type { SortField, SortOrder, TaskPriority, TaskStatus } from "../types";

export type StatusFilter = "all" | TaskStatus;
export type PriorityFilter = "all" | TaskPriority;

interface TaskFiltersProps {
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
}

const fieldSx = { minWidth: { xs: "100%", sm: 140 }, flex: { sm: "1 1 140px" } };

export function TaskFilters({
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
}: TaskFiltersProps) {
  return (
    <Box
      aria-label="Task filters"
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        flexWrap: "wrap",
        gap: 1.5,
        mb: 2,
      }}
    >
      <TextField
        label="Search title"
        type="search"
        size="small"
        value={searchInput}
        onChange={(e) => onSearchInputChange(e.target.value)}
        placeholder="Search by title…"
        slotProps={{
          htmlInput: { "data-testid": "task-search" },
        }}
        sx={{ flex: { sm: "2 1 200px" }, minWidth: { xs: "100%", sm: 180 } }}
      />

      <FormControl size="small" sx={fieldSx}>
        <InputLabel id="status-filter-label">Status</InputLabel>
        <Select
          labelId="status-filter-label"
          label="Status"
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as StatusFilter)
          }
          data-testid="status-filter"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="TODO">To do</MenuItem>
          <MenuItem value="IN_PROGRESS">In progress</MenuItem>
          <MenuItem value="DONE">Done</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={fieldSx}>
        <InputLabel id="priority-filter-label">Priority</InputLabel>
        <Select
          labelId="priority-filter-label"
          label="Priority"
          value={priorityFilter}
          onChange={(e) =>
            onPriorityFilterChange(e.target.value as PriorityFilter)
          }
          data-testid="priority-filter"
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="LOW">Low</MenuItem>
          <MenuItem value="MEDIUM">Medium</MenuItem>
          <MenuItem value="HIGH">High</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={fieldSx}>
        <InputLabel id="sort-field-label">Sort by</InputLabel>
        <Select
          labelId="sort-field-label"
          label="Sort by"
          value={sortField}
          onChange={(e) => onSortFieldChange(e.target.value as SortField)}
          data-testid="sort-field"
        >
          <MenuItem value="dueDate">Due date</MenuItem>
          <MenuItem value="createdAt">Created</MenuItem>
        </Select>
      </FormControl>

      <FormControl size="small" sx={fieldSx}>
        <InputLabel id="sort-order-label">Order</InputLabel>
        <Select
          labelId="sort-order-label"
          label="Order"
          value={sortOrder}
          onChange={(e) => onSortOrderChange(e.target.value as SortOrder)}
          data-testid="sort-order"
        >
          <MenuItem value="asc">Ascending</MenuItem>
          <MenuItem value="desc">Descending</MenuItem>
        </Select>
      </FormControl>
    </Box>
  );
}