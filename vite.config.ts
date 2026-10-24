import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "web-offline-shell",
      apply: "build",
      generateBundle(_options, bundle) {
        const assets = [
          "/baize.svg",
          "/baize-design.svg",
          "/baize-white.svg",
          ...Object.keys(bundle)
            .filter((name) => /\.(?:js|css|woff2?|svg|png|webp)$/.test(name))
            .map((name) => "/" + name),
        ].sort();
        const id = createHash("sha256")
          .update(JSON.stringify(assets))
          .digest("hex")
          .slice(0, 16);
        const source = readFileSync(
          new URL("./scripts/offline-worker-template.js", import.meta.url),
          "utf8",
        )
          .replace("__BUILD_ID__", id)
          .replace("__ASSET_LIST__", JSON.stringify(assets));
        this.emitFile({ type: "asset", fileName: "offline-sw.js", source });
      },
    },
  ],
  server: { port: 4318, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (/node_modules\/(paper|clipper-lib)\//.test(id))
            return "vector-kernel";
        },
      },
    },
  },
});
