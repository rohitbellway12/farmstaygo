import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const rawAllowedHosts = process.env.VITE_PREVIEW_ALLOWED_HOSTS || "";

const allowedHosts = rawAllowedHosts
  .split(",")
  .map((host: string) => host.trim())
  .filter((host: string) => host.length > 0);

if (allowedHosts.length === 0) {
  allowedHosts.push("portal.farmstaygo.com");
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  preview: {
    allowedHosts,
  },
});