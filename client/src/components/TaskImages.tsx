import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";
import { ApiError } from "../api";
import { listImages, uploadImage, type TaskImage } from "../imagesApi";

const MAX_IMAGES = 4;

export interface TaskImagesProps {
  taskId?: string;
  allowUpload?: boolean;
  pendingFiles?: File[];
  onPendingFilesChange?: (files: File[]) => void;
}

export function TaskImages({
  taskId,
  allowUpload = false,
  pendingFiles = [],
  onPendingFilesChange,
}: TaskImagesProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const imagesQuery = useQuery({
    queryKey: ["task-images", taskId],
    queryFn: () => listImages(taskId!),
    enabled: Boolean(taskId),
  });

  const savedImages = imagesQuery.data?.data ?? [];

  const uploadMutation = useMutation({
    mutationFn: () => {
      if (!taskId || !selectedFile) {
        throw new Error("No file selected");
      }
      return uploadImage(taskId, selectedFile);
    },
    onSuccess: async () => {
      setSelectedFile(null);
      setUploadError(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      await queryClient.invalidateQueries({
        queryKey: ["task-images", taskId],
      });
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        setUploadError(err.body.error.message);
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("Could not upload image.");
      }
    },
  });

  if (!allowUpload && savedImages.length === 0) {
    return null;
  }

  const atLimit = taskId
    ? savedImages.length >= MAX_IMAGES
    : pendingFiles.length >= MAX_IMAGES;

  function addPendingFile(file: File | null) {
    if (!file || !onPendingFilesChange) return;
    if (pendingFiles.length >= MAX_IMAGES) {
      setUploadError("A task can have at most four images");
      return;
    }
    setUploadError(null);
    onPendingFilesChange([...pendingFiles, file]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <Box
      component="section"
      aria-label="Images"
      data-testid="task-images"
      sx={{ pt: allowUpload || savedImages.length > 0 ? 2 : 0 }}
    >
      {savedImages.length > 0 ? (
        <>
          <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
            Images
          </Typography>
          <ImageRow images={savedImages} />
        </>
      ) : null}

      {allowUpload && !taskId && pendingFiles.length > 0 ? (
        <Stack spacing={0.5} sx={{ mb: 1.5 }}>
          {pendingFiles.map((file) => (
            <Typography key={`${file.name}-${file.size}`} variant="caption">
              {file.name}
            </Typography>
          ))}
        </Stack>
      ) : null}

      {allowUpload ? (
        <Stack spacing={1.25}>
          <Button
            variant="outlined"
            component="label"
            size="small"
            type="button"
            disabled={uploadMutation.isPending || atLimit}
          >
            Choose file
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              hidden
              data-testid="image-input"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                const file = event.target.files?.[0] ?? null;
                if (taskId) {
                  setSelectedFile(file);
                  setUploadError(null);
                } else {
                  addPendingFile(file);
                }
              }}
            />
          </Button>
          {taskId && selectedFile ? (
            <Typography variant="caption" color="text.secondary">
              {selectedFile.name}
            </Typography>
          ) : null}
          {uploadError ? (
            <Alert severity="error" data-testid="image-error">
              {uploadError}
            </Alert>
          ) : null}
          {taskId ? (
            <Box>
              <Button
                type="button"
                variant="contained"
                size="small"
                disabled={!selectedFile || uploadMutation.isPending || atLimit}
                onClick={() => {
                  if (!selectedFile) return;
                  setUploadError(null);
                  uploadMutation.mutate();
                }}
                data-testid="image-upload"
              >
                Upload image
              </Button>
            </Box>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}

function ImageRow({ images }: { images: TaskImage[] }) {
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ mb: 2, flexWrap: "wrap" }}
    >
      {images.map((image) => (
        <Box
          key={image.id}
          component="img"
          src={image.url}
          alt={image.originalName}
          sx={{
            width: 96,
            height: 96,
            objectFit: "cover",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        />
      ))}
    </Stack>
  );
}
