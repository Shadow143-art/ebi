import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    // Use / by default for Vercel/Render/Netlify.
    // Set VITE_BASE_PATH=/ebi/ only when deploying to GitHub Pages project site.
    base: env.VITE_BASE_PATH || "/",
    plugins: [react()],
    server: {
      port: 5173
    }
  };
});
