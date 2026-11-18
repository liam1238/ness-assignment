import fs from "fs";
import path from "path";
import { getConfig } from "../config";
import { createPool } from "./pool";

function databaseName(connectionString: string): string {
  const u = new URL(connectionString);
  return decodeURIComponent(u.pathname.replace(/^\//, "")).split("/")[0];
}

async function runMigrations(connectionString: string): Promise<void> {
  const dbName = databaseName(connectionString);
  if (dbName === "tasks_test") {
    throw new Error(
      `Refusing to migrate: npm run migrate must use DATABASE_URL, not tasks_test (got ${dbName})`,
    );
  }

  const pool = createPool(connectionString, 1);
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, "../../migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const applied = await client.query<{ filename: string }>(
      "SELECT filename FROM schema_migrations",
    );
    const appliedSet = new Set(applied.rows.map((r) => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) continue;
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (filename) VALUES ($1)",
          [file],
        );
        await client.query("COMMIT");
        console.log(`Applied migration: ${file}`);
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const { databaseUrl } = getConfig();
  await runMigrations(databaseUrl);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});