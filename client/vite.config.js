import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(
  {
    plugins:
      [
        react(),
        tailwindcss(),
      ],
    server:
      {
        proxy:
          {
            "/api":
              {
                target:
                  "http://localhost:5000", // CHANGE THIS to your Node server's port if it isn't 5000
                changeOrigin: true,
              },
          },
      },
  },
);
