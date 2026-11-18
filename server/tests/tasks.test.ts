import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Application } from "express";
import { createApp, createPool } from "../src/app";
import { createClock } from "../src/clock";
import { guardTestDatabase } from "../src/db/guard-test-database";

const FIXED_NOW = new Date("2026-11-18T12:00:00.000Z");
const TODAY = "2026-11-18";
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

describe("tasks API", () => {
  beforeAll(async () => {
    await truncate();
  });

  it("trims title and rejects short or long titles", async () => {
    const ok = await request(app)
      .post("/api/tasks")
      .send({ title: "  abc  ", dueDate: FUTURE_DUE });
    expect(ok.status).toBe(201);
    expect(ok.body.title).toBe("abc");

    const short = await request(app)
      .post("/api/tasks")
      .send({ title: "  ab  ", dueDate: FUTURE_DUE });
    expect(short.status).toBe(400);
    expect(short.body.error.code).toBe("VALIDATION_ERROR");

    const long = await request(app)
      .post("/api/tasks")
      .send({ title: "x".repeat(121), dueDate: FUTURE_DUE });
    expect(long.status).toBe(400);
  });

  it("validates enums and blank optional fields, strips unknown fields", async () => {
    const res = await request(app).post("/api/tasks").send({
      title: "Valid title here",
      dueDate: FUTURE_DUE,
      status: "NOT_A_STATUS",
    });
    expect(res.status).toBe(400);

    const created = await request(app).post("/api/tasks").send({
      title: "Valid title here",
      dueDate: FUTURE_DUE,
      description: "   ",
      assignee: "",
      foo: "bar",
    });
    expect(created.status).toBe(201);
    expect(created.body.description).toBeNull();
    expect(created.body.assignee).toBeNull();
    expect(created.body.priority).toBe("MEDIUM");
    expect(created.body.status).toBe("TODO");
    expect(created.body).not.toHaveProperty("foo");

    const withNulls = await request(app).post("/api/tasks").send({
      title: "Null optionals ok",
      dueDate: FUTURE_DUE,
      description: null,
      assignee: null,
    });
    expect(withNulls.status).toBe(201);
    expect(withNulls.body.description).toBeNull();
    expect(withNulls.body.assignee).toBeNull();
  });

  it("create with explicit DONE has empty history", async () => {
    const id = await createTask({ status: "DONE" });
    const hist = await request(app).get(`/api/tasks/${id}/status-history`);
    expect(hist.status).toBe(200);
    expect(hist.body.data).toEqual([]);
  });

  it("rejects past and impossible calendar dates on create", async () => {
    const past = await request(app)
      .post("/api/tasks")
      .send({ title: "Past due task", dueDate: "2026-11-17" });
    expect(past.status).toBe(400);
    expect(past.body.error.details[0].field).toBe("dueDate");

    const impossible = await request(app)
      .post("/api/tasks")
      .send({ title: "Bad calendar", dueDate: "2026-02-31" });
    expect(impossible.status).toBe(400);

    const withTime = await request(app)
      .post("/api/tasks")
      .send({ title: "With time zone", dueDate: "2026-11-18T00:00:00Z" });
    expect(withTime.status).toBe(400);
  });

  it("accepts today at UTC just before and after midnight", async () => {
    const late = createApp({
      pool,
      clock: createClock(new Date("2026-11-18T23:30:00.000Z")),
    });
    const r1 = await request(late)
      .post("/api/tasks")
      .send({ title: "Late evening", dueDate: "2026-11-18" });
    expect(r1.status).toBe(201);

    const early = createApp({
      pool,
      clock: createClock(new Date("2026-11-19T00:30:00.000Z")),
    });
    const r2 = await request(early)
      .post("/api/tasks")
      .send({ title: "Early morning", dueDate: "2026-11-18" });
    expect(r2.status).toBe(400);
    expect(r2.body.error.details[0].message).toContain("2026-11-19");
  });

  it("handles leap day and non-leap invalid dates", async () => {
    const leapApp = createApp({
      pool,
      clock: createClock(new Date("2024-02-28T12:00:00.000Z")),
    });
    const leap = await request(leapApp)
      .post("/api/tasks")
      .send({ title: "Leap day ok", dueDate: "2024-02-29" });
    expect(leap.status).toBe(201);

    const bad30 = await request(leapApp)
      .post("/api/tasks")
      .send({ title: "Feb 30 bad", dueDate: "2024-02-30" });
    expect(bad30.status).toBe(400);

    const bad29 = await request(app)
      .post("/api/tasks")
      .send({ title: "2025 leap", dueDate: "2025-02-29" });
    expect(bad29.status).toBe(400);
  });

  it("writes one history row on adjacent status change, none on same status", async () => {
    const id = await createTask();
    const same = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ status: "TODO" });
    expect(same.status).toBe(200);

    const next = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ status: "IN_PROGRESS" });
    expect(next.status).toBe(200);

    const hist = await request(app).get(`/api/tasks/${id}/status-history`);
    expect(hist.body.data).toHaveLength(1);
    expect(hist.body.data[0].previousStatus).toBe("TODO");
    expect(hist.body.data[0].newStatus).toBe("IN_PROGRESS");
  });

  it("rejects skip and reverse transitions with 409 and leaves fields unchanged", async () => {
    const id = await createTask({ title: "Immutable on bad tx" });
    const before = await request(app).get(`/api/tasks/${id}`);
    const skip = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ status: "DONE", title: "Should not save" });
    expect(skip.status).toBe(409);
    expect(skip.body.error.code).toBe("INVALID_TRANSITION");
    expect(skip.body.error.message).toBe("Cannot change status from TODO to DONE");

    const after = await request(app).get(`/api/tasks/${id}`);
    expect(after.body.title).toBe(before.body.title);
    expect(after.body.status).toBe("TODO");

    await request(app).patch(`/api/tasks/${id}`).send({ status: "IN_PROGRESS" });
    const reverse = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ status: "TODO" });
    expect(reverse.status).toBe(409);

    const hist = await request(app).get(`/api/tasks/${id}/status-history`);
    expect(hist.body.data).toHaveLength(1);
  });

  it("allows overdue task edits and rejects only a changed past due date", async () => {
    const id = await createTask();
    await pool.query(`UPDATE tasks SET due_date = $1 WHERE id = $2`, [
      "2026-11-10",
      id,
    ]);

    const titleOk = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ title: "New title ok" });
    expect(titleOk.status).toBe(200);

    const sameDue = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ dueDate: "2026-11-10" });
    expect(sameDue.status).toBe(200);

    const pastDue = await request(app)
      .patch(`/api/tasks/${id}`)
      .send({ dueDate: "2026-11-17", title: "Nope" });
    expect(pastDue.status).toBe(400);
    const row = await request(app).get(`/api/tasks/${id}`);
    expect(row.body.title).toBe("New title ok");
  });

  it("empty PATCH leaves updatedAt unchanged", async () => {
    const id = await createTask();
    const before = await request(app).get(`/api/tasks/${id}`);
    const patched = await request(app).patch(`/api/tasks/${id}`).send({});
    expect(patched.status).toBe(200);
    expect(patched.body.updatedAt).toBe(before.body.updatedAt);
  });

  it("lists with filters, search, sort tie-break, and totals", async () => {
    await truncate();
    const a = await createTask({
      title: "Alpha report",
      priority: "HIGH",
      status: "TODO",
      dueDate: "2026-11-25",
    });
    const b = await createTask({
      title: "Beta report",
      priority: "HIGH",
      status: "IN_PROGRESS",
      dueDate: "2026-11-25",
    });
    await pool.query(
      `UPDATE tasks SET created_at = $1 WHERE id = $2`,
      [new Date("2026-11-01T10:00:00.000Z"), a],
    );
    await pool.query(
      `UPDATE tasks SET created_at = $1 WHERE id = $2`,
      [new Date("2026-11-01T11:00:00.000Z"), b],
    );

    const filtered = await request(app).get(
      "/api/tasks?status=IN_PROGRESS&priority=HIGH&q=report",
    );
    expect(filtered.status).toBe(200);
    expect(filtered.body.total).toBe(1);
    expect(filtered.body.data[0].id).toBe(b);

    const sortDue = await request(app).get(
      "/api/tasks?sort=dueDate&order=asc&pageSize=50",
    );
    expect(sortDue.body.data[0].id).toBe(a);
    expect(sortDue.body.data[1].id).toBe(b);

    const sortCreated = await request(app).get(
      "/api/tasks?sort=createdAt&order=desc&pageSize=50",
    );
    expect(sortCreated.body.data[0].id).toBe(b);
    expect(sortCreated.body.data[1].id).toBe(a);
  });

  it("searches literal % _ and backslash without wildcard semantics", async () => {
    await truncate();
    await createTask({ title: "Normal title one" });
    await createTask({ title: "Has percent % inside" });
    await createTask({ title: "Has_under_score" });
    await createTask({ title: String.raw`Has backslash \ path` });

    const pct = await request(app).get("/api/tasks?q=%");
    expect(pct.body.total).toBe(1);
    expect(pct.body.data[0].title).toContain("%");

    const us = await request(app).get("/api/tasks?q=_");
    expect(us.body.total).toBe(1);

    const bs = await request(app).get(`/api/tasks?q=${encodeURIComponent("\\")}`);
    expect(bs.body.total).toBe(1);
  });

  const invalidPages = ["0", "-1", "1.5", "abc"];
  for (const page of invalidPages) {
    it(`rejects invalid page=${page}`, async () => {
      const res = await request(app).get(`/api/tasks?page=${page}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  }

  const invalidSizes = ["0", "-1", "51", "abc"];
  for (const pageSize of invalidSizes) {
    it(`rejects invalid pageSize=${pageSize}`, async () => {
      const res = await request(app).get(`/api/tasks?pageSize=${pageSize}`);
      expect(res.status).toBe(400);
    });
  }

  it("returns empty data and true total for page past the end", async () => {
    await truncate();
    await createTask();
    const res = await request(app).get("/api/tasks?page=2&pageSize=20");
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(1);
    expect(res.body.totalPages).toBe(1);
  });

  it("totalPages is 0 when total is 0", async () => {
    await truncate();
    const res = await request(app).get("/api/tasks");
    expect(res.body.total).toBe(0);
    expect(res.body.totalPages).toBe(0);
  });

  it("two concurrent TODO to IN_PROGRESS produce one history row", async () => {
    await truncate();
    const id = await createTask();
    const [r1, r2] = await Promise.all([
      request(app).patch(`/api/tasks/${id}`).send({ status: "IN_PROGRESS" }),
      request(app).patch(`/api/tasks/${id}`).send({ status: "IN_PROGRESS" }),
    ]);
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);

    const task = await request(app).get(`/api/tasks/${id}`);
    expect(task.body.status).toBe("IN_PROGRESS");

    const hist = await request(app).get(`/api/tasks/${id}/status-history`);
    expect(hist.body.data).toHaveLength(1);
  });

  it("delete returns 204 and removes task and history", async () => {
    const id = await createTask();
    await request(app).patch(`/api/tasks/${id}`).send({ status: "IN_PROGRESS" });
    const del = await request(app).delete(`/api/tasks/${id}`);
    expect(del.status).toBe(204);
    expect(del.text).toBe("");

    const get = await request(app).get(`/api/tasks/${id}`);
    expect(get.status).toBe(404);
    expect(get.body.error.message).toBe("Task not found");

    const hist = await request(app).get(`/api/tasks/${id}/status-history`);
    expect(hist.status).toBe(404);

    const count = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM task_status_history WHERE task_id = $1`,
      [id],
    );
    expect(Number(count.rows[0].count)).toBe(0);
  });

  it("returns 400 for invalid UUID and 404 for missing task", async () => {
    const bad = await request(app).get("/api/tasks/not-a-uuid");
    expect(bad.status).toBe(400);

    const missing = await request(app).get(
      "/api/tasks/00000000-0000-4000-8000-000000000001",
    );
    expect(missing.status).toBe(404);
  });

  it("returns malformed JSON as validation error", async () => {
    const res = await request(app)
      .post("/api/tasks")
      .set("Content-Type", "application/json")
      .send("{");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});