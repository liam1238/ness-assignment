import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { createApp, createPool } from "../src/app";
import { createClock } from "../src/clock";
import { guardTestDatabase } from "../src/db/guard-test-database";

const FIXED_NOW = new Date("2026-11-18T12:00:00.000Z");
const FUTURE_DUE = "2026-11-20";

const PNG_1X1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

let pool: ReturnType<typeof createPool>;
let app: Application;
let uploadDir: string;

function buildApp(now = FIXED_NOW): Application {
  return createApp({ pool, clock: createClock(now), uploadDir });
}

async function truncate() {
  guardTestDatabase();
  await pool.query("TRUNCATE tasks RESTART IDENTITY CASCADE");
}

async function createTask(
  overrides: Record<string, unknown> = {},
): Promise<string> {
  const body = {
    title: "Default task title",
    dueDate: FUTURE_DUE,
    ...overrides,
  };
  const res = await request(app).post("/api/tasks").send(body);
  expect(res.status).toBe(201);
  return res.body.id as string;
}

beforeAll(async () => {
  const url = guardTestDatabase();
  pool = createPool(url, 2);
  uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), "task-images-test-"));
  app = buildApp();
  await truncate();
});

afterAll(async () => {
  await pool?.end();
  await fs.rm(uploadDir, { recursive: true, force: true });
});

describe("task images API", () => {
  beforeEach(async () => {
    await truncate();
    const entries = await fs.readdir(uploadDir);
    await Promise.all(
      entries.map((name) =>
        fs.rm(path.join(uploadDir, name), { recursive: true, force: true }),
      ),
    );
  });

  it("uploads a small PNG and lists it", async () => {
    const taskId = await createTask();
    const uploaded = await request(app)
      .post(`/api/tasks/${taskId}/images`)
      .attach("image", PNG_1X1, {
        filename: "dot.png",
        contentType: "image/png",
      });
    expect(uploaded.status).toBe(201);
    expect(uploaded.body).toMatchObject({
      taskId,
      originalName: "dot.png",
      mimeType: "image/png",
      sizeBytes: PNG_1X1.length,
    });
    expect(uploaded.body.id).toBeDefined();
    expect(uploaded.body.url).toBe(
      `/api/tasks/${taskId}/images/${uploaded.body.id}`,
    );

    const list = await request(app).get(`/api/tasks/${taskId}/images`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toEqual(uploaded.body);
  });

  it("fetches the bytes back with the image URL", async () => {
    const taskId = await createTask();
    const uploaded = await request(app)
      .post(`/api/tasks/${taskId}/images`)
      .attach("image", PNG_1X1, {
        filename: "pixel.png",
        contentType: "image/png",
      });
    expect(uploaded.status).toBe(201);

    const file = await request(app).get(uploaded.body.url);
    expect(file.status).toBe(200);
    expect(file.headers["content-type"]).toMatch(/image\/png/);
    expect(file.body).toEqual(PNG_1X1);
  });

  it("rejects a non-image", async () => {
    const taskId = await createTask();
    const bad = await request(app)
      .post(`/api/tasks/${taskId}/images`)
      .attach("image", Buffer.from("not an image"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");

    const list = await request(app).get(`/api/tasks/${taskId}/images`);
    expect(list.body.data).toEqual([]);

    const entries = await fs.readdir(uploadDir);
    expect(entries).toEqual([]);
  });

  it("a second task does not list the first task's image", async () => {
    const taskA = await createTask({ title: "Task A title here" });
    const taskB = await createTask({ title: "Task B title here" });
    await request(app)
      .post(`/api/tasks/${taskA}/images`)
      .attach("image", PNG_1X1, {
        filename: "only-a.png",
        contentType: "image/png",
      });

    const listB = await request(app).get(`/api/tasks/${taskB}/images`);
    expect(listB.status).toBe(200);
    expect(listB.body.data).toEqual([]);

    const listA = await request(app).get(`/api/tasks/${taskA}/images`);
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].originalName).toBe("only-a.png");
  });

  it("deleting the task removes the image row", async () => {
    const taskId = await createTask();
    await request(app)
      .post(`/api/tasks/${taskId}/images`)
      .attach("image", PNG_1X1, {
        filename: "gone.png",
        contentType: "image/png",
      });

    const del = await request(app).delete(`/api/tasks/${taskId}`);
    expect(del.status).toBe(204);

    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_images WHERE task_id = $1`,
      [taskId],
    );
    expect(Number(count.rows[0].count)).toBe(0);

    const list = await request(app).get(`/api/tasks/${taskId}/images`);
    expect(list.status).toBe(404);
  });
});