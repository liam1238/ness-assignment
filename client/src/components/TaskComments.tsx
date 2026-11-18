import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ApiError } from "../api";
import { createComment, listComments } from "../commentsApi";

function formatCreatedAt(iso: string): string {
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

export interface TaskCommentsProps {
  taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [author, setAuthor] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["task-comments", taskId],
    queryFn: () => listComments(taskId),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      createComment(taskId, {
        body,
        author: author.trim() === "" ? null : author,
      }),
    onSuccess: async () => {
      setBody("");
      setAuthor("");
      setSubmitError(null);
      await queryClient.invalidateQueries({
        queryKey: ["task-comments", taskId],
      });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setSubmitError(err.body.error.message);
      } else if (err instanceof Error) {
        setSubmitError(err.message);
      } else {
        setSubmitError("Could not add comment.");
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    addMutation.mutate();
  };

  return (
    <Box
      component="section"
      aria-labelledby="task-comments-title"
      data-testid="task-comments"
      sx={{
        pt: 2,
        mt: 0.5,
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <Typography
        id="task-comments-title"
        variant="subtitle2"
        sx={{ mb: 1.5, fontWeight: 600 }}
      >
        Comments
      </Typography>

      {commentsQuery.isPending ? (
        <Typography variant="body2" color="text.secondary">
          Loading comments…
        </Typography>
      ) : commentsQuery.isError ? (
        <Typography variant="body2" color="error">
          Comments could not be loaded.
        </Typography>
      ) : commentsQuery.data.data.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          data-testid="comments-empty"
          sx={{ mb: 1.5 }}
        >
          No comments yet.
        </Typography>
      ) : (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {commentsQuery.data.data.map((comment) => (
            <Paper
              key={comment.id}
              variant="outlined"
              sx={{ p: 1.25 }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 1,
                  flexWrap: "wrap",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {comment.author ?? "Someone"}
                </Typography>
                <Typography
                  component="time"
                  variant="caption"
                  color="text.secondary"
                  dateTime={comment.createdAt}
                >
                  {formatCreatedAt(comment.createdAt)}
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                {comment.body}
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={1.25}>
          <TextField
            label="Comment"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            fullWidth
            multiline
            minRows={2}
            size="small"
            data-testid="comment-body"
          />
          <TextField
            label="Author (optional)"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            fullWidth
            size="small"
            data-testid="comment-author"
          />
          {submitError ? (
            <Alert severity="error" data-testid="comment-error">
              {submitError}
            </Alert>
          ) : null}
          <Box>
            <Button
              type="submit"
              variant="contained"
              size="small"
              disabled={addMutation.isPending}
              data-testid="comment-submit"
            >
              Add comment
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}