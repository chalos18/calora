import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // Resolve to source, so tests never depend on dist being rebuilt.
      "@calora/core": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "server/src/**/*.test.ts",
      "data/seed/src/**/*.test.ts",
      "apps/mobile/src/**/*.test.ts",
    ],
    // Server tests boot PGlite, an in-process Postgres compiled to WASM. Its
    // first-run initialisation is slow enough to blow the 10s default once
    // several files start at once, and each instance is memory-hungry - hence
    // the worker cap as well.
    hookTimeout: 60_000,
    testTimeout: 30_000,
    maxWorkers: 2,
  },
});
