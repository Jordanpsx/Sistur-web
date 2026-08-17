import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/**
 * Vitest runs in Node, not in Next's bundler, so the `@/` alias has to be
 * restated here. Integration suites read SISTUR_API_URL / SITE_URL from .env and
 * skip themselves when those are absent, which keeps `npm test` green on a
 * machine with no backend.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration specs talk to a real Sistur; running them in parallel would
    // race on the same physical resources.
    fileParallelism: false,
  },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
