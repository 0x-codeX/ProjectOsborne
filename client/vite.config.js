import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(
  {
    plugins:
      [
        react(),
        tailwindcss(),
        VitePWA(
          {
            registerType:
              "autoUpdate",
            // The server will crash if these files are missing from your public/ folder.
            // If you don't have them yet, comment out the includeAssets and icons arrays.
            includeAssets:
              [
                "favicon.ico",
                "apple-touch-icon.png",
              ],
            manifest:
              {
                name: "Nippy",
                short_name:
                  "Nippy",
                description:
                  "Nippy Platform",
                theme_color:
                  "#09090b",
                background_color:
                  "#09090b",
                display:
                  "standalone",
                start_url:
                  "/",
                icons:
                  [
                    {
                      src: "NippyLogo.png",
                      sizes:
                        "192x192",
                      type: "image/png",
                    },
                    {
                      src: "NippyLogo.png",
                      sizes:
                        "512x512",
                      type: "image/png",
                    },
                    {
                      src: "NippyLogo.png",
                      sizes:
                        "512x512",
                      type: "image/png",
                      purpose:
                        "any maskable",
                    },
                  ],
              },
          },
        ),
        workbox, {
        maximumFileSizeToCacheInBytes: 4000000 // 4 MB
      },
      ],
    server:
      {
        proxy:
          {
            "/api":
              {
                target:
                  "http://localhost:5000",
                changeOrigin: true,
              },
          },
      },
  },
);
