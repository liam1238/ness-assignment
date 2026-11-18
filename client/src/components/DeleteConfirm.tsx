import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import type { Task } from "../types";

interface DeleteConfirmProps {
  task: Task;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirm({
  task,
  isPending,
  onConfirm,
  onCancel,
}: DeleteConfirmProps) {
  return (
    <Dialog
      open
      onClose={isPending ? undefined : onCancel}
      maxWidth="xs"
      fullWidth
      role="alertdialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-desc"
    >
      <DialogTitle id="delete-title">Delete task?</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-desc">
          This permanently removes “{task.title}”. This cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          data-testid="cancel-delete"
          disabled={isPending}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          data-testid="confirm-delete"
          disabled={isPending}
          onClick={onConfirm}
        >
          {isPending ? "Deleting…" : "Delete"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}