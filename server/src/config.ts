import path from "path";

export function getUploadDir(): string {
  const raw = process.env.UPLOAD_DIR ?? "server/uploads";
  if (path.isAbsolute(raw)) {
    return raw;
  }
  const repoRoot = path.resolve(__dirname, "../..");
  return path.resolve(repoRoot, raw);
}

export function getConfig(): { apiPort: number; databaseUrl: string; uploadDir: string } {
  const apiPort = Number(process.env.API_PORT ?? "3001");
  if (!Number.isInteger(apiPort) || apiPort < 1 || apiPort > 65535) {
    throw new Error("API_PORT must be a valid port number");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim() === "") {
    throw new Error("DATABASE_URL is required");
  }

  return { apiPort, databaseUrl, uploadDir: getUploadDir() };
}

export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error("TEST_DATABASE_URL is required");
  }
  return url.trim();
}