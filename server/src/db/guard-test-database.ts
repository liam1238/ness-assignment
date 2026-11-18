export function guardTestDatabase(): string {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl || testUrl.trim() === "") {
    throw new Error(
      "Refusing to migrate or truncate: TEST_DATABASE_URL is missing or blank",
    );
  }

  const trimmedTest = testUrl.trim();
  let testDbName: string;
  try {
    const u = new URL(trimmedTest);
    if (u.protocol !== "postgres:" && u.protocol !== "postgresql:") {
      throw new Error("not postgres");
    }
    testDbName = decodeURIComponent(u.pathname.replace(/^\//, "")).split("/")[0];
    if (!testDbName) {
      throw new Error("no db name");
    }
  } catch {
    throw new Error(
      "Refusing to migrate or truncate: TEST_DATABASE_URL is not a valid Postgres URL with a database name",
    );
  }

  if (testDbName !== "tasks_test") {
    throw new Error(
      `Refusing to migrate or truncate: database name must be exactly tasks_test, got ${testDbName}`,
    );
  }

  const devUrl = process.env.DATABASE_URL;
  if (devUrl && devUrl.trim() !== "") {
    try {
      const u = new URL(devUrl.trim());
      const devDbName = decodeURIComponent(u.pathname.replace(/^\//, "")).split(
        "/",
      )[0];
      if (devDbName === "tasks_test") {
        throw new Error(
          "Refusing to migrate or truncate: DATABASE_URL must not point at tasks_test",
        );
      }
      if (sameDatabase(trimmedTest, devUrl.trim())) {
        throw new Error(
          "Refusing to migrate or truncate: DATABASE_URL and TEST_DATABASE_URL identify the same database",
        );
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Refusing")) {
        throw e;
      }
      // invalid DATABASE_URL — guard only cares when it's set and parseable
    }
  }

  return trimmedTest;
}

function sameDatabase(a: string, b: string): boolean {
  try {
    const ua = new URL(a);
    const ub = new URL(b);
    const dbA = decodeURIComponent(ua.pathname.replace(/^\//, "")).split("/")[0];
    const dbB = decodeURIComponent(ub.pathname.replace(/^\//, "")).split("/")[0];
    const hostA = ua.hostname;
    const hostB = ub.hostname;
    const portA = ua.port || "5432";
    const portB = ub.port || "5432";
    return hostA === hostB && portA === portB && dbA === dbB;
  } catch {
    return false;
  }
}