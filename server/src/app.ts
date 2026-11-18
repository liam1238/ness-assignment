import express from "express";
import type { Pool } from "pg";
import type { Clock } from "./clock";
import { getUploadDir } from "./config";
import { createPool } from "./db/pool";
import { TaskRepository } from "./db/task-repository";
import { ImageFileStore } from "./domain/image-files";
import { TaskService } from "./domain/task-service";
import { createTasksRouter } from "./http/tasks-router";
import { errorHandler } from "./http/error-handler";

export type CreateAppOptions = {
  pool: Pool;
  clock: Clock;
  uploadDir?: string;
};

export function createApp({
  pool,
  clock,
  uploadDir = getUploadDir(),
}: CreateAppOptions): express.Application {
  const app = express();

  app.use((req, res, next) => {
    if (req.headers.origin === "http://localhost:5173") {
      res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  });
  app.use(express.json({ limit: "100kb" }));

  const repo = new TaskRepository(pool);
  const imageFiles = new ImageFileStore(uploadDir);
  void imageFiles.ensureUploadDir();
  const service = new TaskService(repo, clock, imageFiles);

  app.use("/api", createTasksRouter(service, { uploadDir }));
  app.use(errorHandler);

  return app;
}

export { createPool };