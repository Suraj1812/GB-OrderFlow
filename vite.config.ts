import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("@mui") || id.includes("@emotion")) {
            return "mui";
          }

          if (id.includes("react") || id.includes("scheduler")) {
            return "react";
          }

          if (id.includes("axios") || id.includes("zod")) {
            return "data";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
