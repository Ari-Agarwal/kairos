import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./src/lib/test-setup.ts"],
  },
  resolve: {
    // Mirror the "@/..." -> "src/..." alias from tsconfig so test files (esp.
    // the integration suites) can resolve "@/lib/..." imports under vitest.
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
