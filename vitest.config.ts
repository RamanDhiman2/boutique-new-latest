import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // The forks pool copies modules through the Windows sandbox temp directory,
    // where its atomic rename fails. Threads avoids that transport path.
    pool: "threads",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
