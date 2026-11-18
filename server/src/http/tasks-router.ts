import { Router } from "express";
import type { TaskService } from "../domain/task-service";
import { asyncHandler } from "./async-handler";
import {
  createTaskImageUpload,
  uploadedFileFromRequest,
} from "./task-image-upload";
import type { RequestHandler } from "express";

export type CreateTasksRouterOptions = {
  uploadDir: string;
};

export function createTasksRouter(
  service: TaskService,
  options: CreateTasksRouterOptions,
): Router {
  const router = Router();
  const uploadImage = createTaskImageUpload(options.uploadDir);

  const handleImageUpload: RequestHandler = (req, res, next) => {
    uploadImage(req, res, (err) => {
      if (err) {
        next(err);
        return;
      }
      next();
    });
  };

  router.post(
    "/tasks",
    asyncHandler(async (req, res) => {
      const task = await service.create(req.body);
      res.status(201).json(task);
    }),
  );

  router.get(
    "/tasks",
    asyncHandler(async (req, res) => {
      const result = await service.list(req.query as Record<string, unknown>);
      res.status(200).json(result);
    }),
  );

  router.get(
    "/tasks/:id/comments",
    asyncHandler(async (req, res) => {
      const result = await service.listComments(req.params.id);
      res.status(200).json(result);
    }),
  );

  router.post(
    "/tasks/:id/comments",
    asyncHandler(async (req, res) => {
      const comment = await service.createComment(req.params.id, req.body);
      res.status(201).json(comment);
    }),
  );

  router.get(
    "/tasks/:id/images",
    asyncHandler(async (req, res) => {
      const result = await service.listImages(req.params.id);
      res.status(200).json(result);
    }),
  );

  router.post(
    "/tasks/:id/images",
    handleImageUpload,
    asyncHandler(async (req, res) => {
      const image = await service.createImage(
        req.params.id,
        uploadedFileFromRequest(req.file),
      );
      res.status(201).json(image);
    }),
  );

  router.get(
    "/tasks/:id/images/:imageId",
    asyncHandler(async (req, res) => {
      const { filePath, mimeType } = await service.readImageFile(
        req.params.id,
        req.params.imageId,
      );
      res.type(mimeType);
      res.sendFile(filePath);
    }),
  );

  router.get(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
      const task = await service.getById(req.params.id);
      res.status(200).json(task);
    }),
  );

  router.patch(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
      const task = await service.patch(req.params.id, req.body);
      res.status(200).json(task);
    }),
  );

  router.delete(
    "/tasks/:id",
    asyncHandler(async (req, res) => {
      await service.delete(req.params.id);
      res.status(204).send();
    }),
  );

  router.get(
    "/tasks/:id/status-history",
    asyncHandler(async (req, res) => {
      const result = await service.statusHistory(req.params.id);
      res.status(200).json(result);
    }),
  );

  return router;
}