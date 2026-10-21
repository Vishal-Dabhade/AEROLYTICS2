import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The build is written to ../dist, which the FastAPI server serves.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: { output: { manualChunks: { vendor: ["react", "react-dom", "react-router-dom"], charts: ["chart.js"] } } },
  },
  // `npm run dev` proxies the API to a locally running FastAPI server
  server: { port: 5173, proxy: { "/api": "http://localhost:8000" } },
});
