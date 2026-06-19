import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Pure-logic unit tests live next to their source (lib/**/*.test.ts); the
// Supabase-backed integration tests live under tests/integration and self-skip
// when no local database is configured (see tests/integration/README.md).
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig `@/*` → project-root mapping.
      "@": fileURLToPath(new URL("./", import.meta.url)).replace(/\/$/, ""),
    },
  },
});
