import { afterEach, describe, expect, it } from "vitest";
import { guardTestDatabase } from "../src/db/guard-test-database";

const original = {
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL,
  DATABASE_URL: process.env.DATABASE_URL,
};

afterEach(() => {
  process.env.TEST_DATABASE_URL = original.TEST_DATABASE_URL;
  process.env.DATABASE_URL = original.DATABASE_URL;
});

describe("test database guard", () => {
  it("aborts when TEST_DATABASE_URL is missing", () => {
    delete process.env.TEST_DATABASE_URL;
    expect(() => guardTestDatabase()).toThrow(/Refusing to migrate or truncate/);
  });

  it("aborts when TEST_DATABASE_URL targets another database", () => {
    process.env.TEST_DATABASE_URL = "postgres://tasks:tasks@localhost:5434/tasks";
    expect(() => guardTestDatabase()).toThrow(/tasks_test/);
  });

  it("aborts when TEST_DATABASE_URL matches the development database", () => {
    const shared = "postgres://tasks:tasks@localhost:5434/tasks_test";
    process.env.DATABASE_URL = shared;
    process.env.TEST_DATABASE_URL = shared;
    expect(() => guardTestDatabase()).toThrow(/Refusing to migrate or truncate/);
  });

  it("returns the dedicated tasks_test URL when it differs from development", () => {
    process.env.DATABASE_URL = "postgres://tasks:tasks@localhost:5434/tasks";
    process.env.TEST_DATABASE_URL =
      "postgres://tasks:tasks@localhost:5434/tasks_test";
    expect(guardTestDatabase()).toBe(
      "postgres://tasks:tasks@localhost:5434/tasks_test",
    );
  });
});
