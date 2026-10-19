import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Vitest workers crash on Windows with the default worker count (exit code 3221226505).
    maxWorkers: 3,
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
  },
  define: {
    __BUILD_ID__: JSON.stringify("test-build"),
  },
});
