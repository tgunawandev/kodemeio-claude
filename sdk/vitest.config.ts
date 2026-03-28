// =============================================================================
// vitest.config.ts — Test configuration for the KodeClaw daemon
// =============================================================================

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    pool: "forks",
    include: ["__tests__/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary"],
      include: ["daemon/**/*.ts"],
      exclude: ["daemon/**/types.ts", "daemon/index.ts"],
    },
    isolate: true,
    testTimeout: 10000,
  },
});
