import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Deployed as a GitHub Pages project site: https://gatherloop.github.io/game-master-bell/
const pagesBase = "/game-master-bell/";

export default defineConfig(({ command }) => ({
  base: command === "build" ? pagesBase : "/",
  plugins: [react()],
}));
