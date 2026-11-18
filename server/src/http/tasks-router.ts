import { Router } from "express";
import type { TaskService } from "../domain/task-service";
import { asyncHandler } from "./async-handler";

export function createTasksRouter(service: TaskService): Router {
  const router = Router();

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