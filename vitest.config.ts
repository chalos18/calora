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
  },
});
