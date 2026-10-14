import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
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
