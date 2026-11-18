import { describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { createApp, createPool } from "../src/app";
import { createClock } from "../src/clock";
import { guardTestDatabase } from "../src/db/guard-test-database";

const FIXED_NOW = new Date("2026-11-18T12:00:00.000Z");
const FUTURE_DUE = "2026-11-20";

let pool: ReturnType<typeof createPool>;
let app: Application;

function buildApp(now = FIXED_NOW): Application {
  return createApp({ pool, clock: createClock(now) });
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
  app = buildApp();
  await truncate();
});

afterAll(async () => {
  await pool?.end();
});

describe("task comments API", () => {
  beforeEach(async () => {
    await truncate();
  });

  it("creates a comment and reads it back on that task", async () => {
    const taskId = await createTask();
    const created = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: "  First note  ", author: "  Alice  " });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      taskId,
      body: "First note",
      author: "Alice",
    });
    expect(created.body.id).toBeDefined();
    expect(created.body.createdAt).toBeDefined();

    const list = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toEqual(created.body);
  });

  it("a second task does not see the first task's comment", async () => {
    const taskA = await createTask({ title: "Task A title here" });
    const taskB = await createTask({ title: "Task B title here" });
    await request(app)
      .post(`/api/tasks/${taskA}/comments`)
      .send({ body: "Only on A" });

    const listB = await request(app).get(`/api/tasks/${taskB}/comments`);
    expect(listB.status).toBe(200);
    expect(listB.body.data).toEqual([]);

    const listA = await request(app).get(`/api/tasks/${taskA}/comments`);
    expect(listA.body.data).toHaveLength(1);
    expect(listA.body.data[0].body).toBe("Only on A");
  });

  it("rejects blank body with 400 and stores nothing", async () => {
    const taskId = await createTask();
    const blank = await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: "   " });
    expect(blank.status).toBe(400);
    expect(blank.body.error.code).toBe("VALIDATION_ERROR");

    const list = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(list.body.data).toEqual([]);

    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_comments WHERE task_id = $1`,
      [taskId],
    );
    expect(Number(count.rows[0].count)).toBe(0);
  });

  it("returns 404 for comments on a missing task", async () => {
    const missingId = "00000000-0000-4000-8000-000000000001";
    const get = await request(app).get(`/api/tasks/${missingId}/comments`);
    expect(get.status).toBe(404);
    expect(get.body.error.message).toBe("Task not found");

    const post = await request(app)
      .post(`/api/tasks/${missingId}/comments`)
      .send({ body: "Hello" });
    expect(post.status).toBe(404);
    expect(post.body.error.message).toBe("Task not found");
  });

  it("deleting the task removes its comments", async () => {
    const taskId = await createTask();
    await request(app)
      .post(`/api/tasks/${taskId}/comments`)
      .send({ body: "Gone with task" });

    const del = await request(app).delete(`/api/tasks/${taskId}`);
    expect(del.status).toBe(204);

    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_comments WHERE task_id = $1`,
      [taskId],
    );
    expect(Number(count.rows[0].count)).toBe(0);

    const list = await request(app).get(`/api/tasks/${taskId}/comments`);
    expect(list.status).toBe(404);
  });
});