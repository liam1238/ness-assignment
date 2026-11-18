import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Snackbar from "@mui/material/Snackbar";
import { AppHeader } from "./components/AppHeader";
import { DeleteConfirm } from "./components/DeleteConfirm";
import { TaskForm } from "./components/TaskForm";
import { TaskDetailModal } from "./components/TaskDetailModal";
import { TaskListPanel } from "./components/TaskListPanel";
import { useTaskBoard } from "./useTaskBoard";

export default function App() {
  const board = useTaskBoard();

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader onOpenCreate={board.openCreate} />

      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        {board.mutationError && !board.formMode && !board.deletingTask ? (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            data-testid="request-error"
            role="alert"
          >
            {board.mutationError}
          </Alert>
        ) : null}

        {board.listError ? (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            data-testid="request-error"
            role="alert"
          >
            {board.listError}
          </Alert>
        ) : null}

        <TaskListPanel
          searchInput={board.searchInput}
          onSearchInputChange={board.setSearchInput}
          statusFilter={board.statusFilter}
          onStatusFilterChange={board.handleStatusFilterChange}
          priorityFilter={board.priorityFilter}
          onPriorityFilterChange={board.handlePriorityFilterChange}
          sortField={board.sortField}
          onSortFieldChange={board.handleSortFieldChange}
          sortOrder={board.sortOrder}
          onSortOrderChange={board.handleSortOrderChange}
          isPending={board.tasksQuery.isPending}
          isError={board.tasksQuery.isError}
          tasks={board.tasksQuery.data?.data ?? []}
          hasActiveFilters={board.hasActiveFilters}
          showPagination={!board.tasksQuery.isPending && !board.tasksQuery.isError}
          currentPage={board.currentPage}
          totalPages={board.totalPages}
          total={board.total}
          onPageChange={board.setPage}
          onEdit={board.openEdit}
          onDelete={(task) => {
            board.setMutationError(null);
            board.setDeletingTask(task);
          }}
          onOpen={(task) => board.openDetail(task.id)}
        />
      </Container>

      <Snackbar
        open={Boolean(board.successMessage)}
        autoHideDuration={4000}
        onClose={() => board.setSuccessMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => board.setSuccessMessage(null)}
          severity="success"
          variant="filled"
          data-testid="success-status"
          role="status"
          sx={{ width: "100%" }}
        >
          {board.successMessage}
        </Alert>
      </Snackbar>

      {board.formMode ? (
        <TaskForm
          mode={board.formMode}
          initialTask={board.editingTask ?? undefined}
          isPending={board.formPending}
          onSubmit={board.handleFormSubmit}
          onCancel={() => {
            board.setFormMode(null);
            board.setEditingTask(null);
          }}
        />
      ) : null}

      {board.detailTaskId ? (
        <TaskDetailModal
          taskId={board.detailTaskId}
          onClose={board.closeDetail}
        />
      ) : null}

      {board.deletingTask ? (
        <DeleteConfirm
          task={board.deletingTask}
          isPending={board.deleteMutation.isPending}
          onConfirm={() => void board.deleteMutation.mutate(board.deletingTask!.id)}
          onCancel={() => board.setDeletingTask(null)}
        />
      ) : null}
    </Box>
  );
}
