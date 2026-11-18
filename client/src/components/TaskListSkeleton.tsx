import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";

export function TaskListSkeleton() {
  return (
    <Box data-testid="loading-state" aria-busy="true" aria-label="Loading tasks">
      <Stack spacing={1.25}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={44}
            sx={{ borderRadius: "11px" }}
          />
        ))}
      </Stack>
    </Box>
  );
}