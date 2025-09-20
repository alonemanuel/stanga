import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/tests/setupTests.ts"],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      "@": "/Users/alonemanuel/AlonPersonal/stanga/src",
    },
  },
});


