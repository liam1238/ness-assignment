import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useQuery } from "@tanstack/react-query";
import { getStatusHistory } from "../api";
import { formatStatus } from "../labels";

function formatChangedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface StatusHistoryProps {
  taskId: string;
}

export function StatusHistory({ taskId }: StatusHistoryProps) {
  const historyQuery = useQuery({
    queryKey: ["status-history", taskId],
    queryFn: () => getStatusHistory(taskId),
  });

  return (
    <Box
      component="section"
      aria-labelledby="status-history-title"
      sx={{
        pt: 2,
        mt: 0.5,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Typography
        id="status-history-title"
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: 600 }}
      >
        Status history
      </Typography>
      {historyQuery.isPending ? (
        <Typography variant="body2" color="text.secondary">
          Loading history…
        </Typography>
      ) : historyQuery.isError ? (
        <Typography variant="body2" color="error">
          History could not be loaded.
        </Typography>
      ) : historyQuery.data.data.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="status-history-empty"
        >
          No status changes yet.
        </Typography>
      ) : (
        <Stack
          component="ul"
          spacing={0.75}
          data-testid="status-history"
          sx={{ listStyle: "none", m: 0, p: 0 }}
        >
          {historyQuery.data.data.map((item) => (
            <Box
              component="li"
              key={item.id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2">
                {formatStatus(item.previousStatus)} to{" "}
                {formatStatus(item.newStatus)}
              </Typography>
              <Typography
                component="time"
                variant="caption"
                color="text.secondary"
                dateTime={item.changedAt}
              >
                {formatChangedAt(item.changedAt)}
              </Typography>
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}