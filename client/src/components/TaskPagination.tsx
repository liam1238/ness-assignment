import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

interface TaskPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function TaskPagination({
  currentPage,
  totalPages,
  total,
  onPageChange,
}: TaskPaginationProps) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        mt: 2.5,
        pt: 2,
        borderTop: 1,
        borderColor: "divider",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Button
        size="small"
        variant="outlined"
        data-testid="page-prev"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
      >
        Previous
      </Button>
      <Typography
        variant="body2"
        color="text.secondary"
        data-testid="page-status"
        sx={{ px: 0.5 }}
      >
        Page {currentPage}
        {totalPages > 0 ? ` of ${totalPages}` : ""} ({total} tasks)
      </Typography>
      <Button
        size="small"
        variant="outlined"
        data-testid="page-next"
        disabled={totalPages === 0 || currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next
      </Button>
    </Stack>
  );
}