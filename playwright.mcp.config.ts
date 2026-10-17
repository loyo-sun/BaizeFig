import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
export default defineConfig({
  ...base,
  testMatch: "mcp.spec.ts",
  workers: 1,
  use: { ...base.use, channel: "chrome" },
});
