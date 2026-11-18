import multer from "multer";
import path from "path";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  generateStoredName,
} from "../domain/image-files";
import { validationError } from "../domain/errors";

export function createTaskImageUpload(uploadDir: string) {
  return multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, file, cb) => {
        cb(null, generateStoredName(file.mimetype));
      },
    }),
    limits: { fileSize: 2 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, cb) => {
      if (ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
        return;
      }
      cb(
        validationError("Request validation failed", [
          {
            field: "image",
            message: "Only JPEG, PNG, WebP, and GIF images are allowed",
          },
        ]),
      );
    },
  }).single("image");
}

export function uploadedFileFromRequest(
  file: Express.Multer.File | undefined,
): {
  storedName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
} | undefined {
  if (!file) return undefined;
  return {
    storedName: path.basename(file.filename),
    originalName: file.originalname,
    mimeType: file.mimetype,
    sizeBytes: file.size,
  };
}