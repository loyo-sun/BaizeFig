import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    css: { include: /@fontsource-variable\/inter/ },
    include: ["tests/**/*.test.ts"],
  },
});
