import fs from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export function extensionForMime(mimeType: string): string | null {
  return MIME_TO_EXT[mimeType] ?? null;
}

export function generateStoredName(mimeType: string): string {
  const ext = extensionForMime(mimeType) ?? "";
  return `${randomUUID()}${ext}`;
}

export class ImageFileStore {
  constructor(private readonly uploadDir: string) {}

  get uploadRoot(): string {
    return path.resolve(this.uploadDir);
  }

  async ensureUploadDir(): Promise<void> {
    await fs.mkdir(this.uploadRoot, { recursive: true });
  }

  resolveStoredPath(storedName: string): string | null {
    if (
      storedName.includes("/") ||
      storedName.includes("\\") ||
      storedName.includes("\0")
    ) {
      return null;
    }
    const base = this.uploadRoot;
    const full = path.resolve(base, storedName);
    if (full !== base && !full.startsWith(base + path.sep)) {
      return null;
    }
    return full;
  }

  async deleteFile(storedName: string): Promise<void> {
    const resolved = this.resolveStoredPath(storedName);
    if (!resolved) return;
    try {
      await fs.unlink(resolved);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code !== "ENOENT") throw e;
    }
  }

  async deleteFiles(storedNames: string[]): Promise<void> {
    await Promise.all(storedNames.map((name) => this.deleteFile(name)));
  }
}