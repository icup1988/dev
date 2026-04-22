import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages: /your-repo-name/
  // Reads from env var set in GitHub Actions, defaults to '/' for local dev
  base: process.env.VITE_BASE_PATH || "/",
  build: {
    outDir: "dist",
  },
});
