import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    globalSetup: ["tests/global-setup.ts"],
    hookTimeout: 30000,
    testTimeout: 20000,
    sequence: {
      concurrent: false,
    },
  },
});