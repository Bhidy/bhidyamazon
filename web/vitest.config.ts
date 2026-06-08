import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Institutional unit-test gate for the fee/VAT engine (src/lib/fees.ts).
 *
 * - Node environment: the math under test is pure and DOM-free.
 * - The `@/*` alias mirrors tsconfig.json `paths` ("@/*" -> "./src/*") so test
 *   imports (`@/lib/fees`) resolve identically to the app. We map it manually
 *   (no extra plugin/dependency) to keep the test toolchain self-contained.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/__tests__/**/*.test.ts", "src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
