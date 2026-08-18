import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
      manifest: {
        name: "Novaryn — Organize Thoughts. Shape Decisions.",
        short_name: "Novaryn",
        description: "A professional, timeless thinking instrument for executives, researchers, consultants, and entrepreneurs.",
        theme_color: "#1a1611",
        background_color: "#faf8f5",
        display: "standalone",
        orientation: "portrait-primary",
        start_url: "/app",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        // Let the OS offer Novaryn in "Open with" for PDFs (desktop PWA file handling).
        file_handlers: [
          {
            action: "/app",
            accept: {
              "application/pdf": [".pdf"],
            },
            icons: [{ src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" }],
            launch_type: "single-client",
          },
        ] as any,
        // Android surfaces installed PWAs through the share sheet ("Open with" / "Share").
        share_target: {
          action: "/share-pdf",
          method: "POST",
          enctype: "multipart/form-data",
          params: {
            title: "title",
            text: "text",
            url: "url",
            files: [
              {
                name: "file",
                accept: ["application/pdf", ".pdf"],
              },
            ],
          },
        } as any,
        launch_handler: {
          client_mode: "navigate-existing",
        } as any,
      },
      workbox: {
        // Handles POSTed PDFs from the OS share sheet before falling through to the app shell.
        importScripts: ["/share-target-handler.js"],
        navigateFallbackDenylist: [/^\/share-pdf/],
        // Include .mjs so the PDF.js worker (pdf.worker.min.mjs) is precached and works offline.
        globPatterns: ["**/*.{js,mjs,css,html,ico,png,svg,woff2,wasm}"],
        // WatermelonDB + LokiJS + PDF.js push the main chunk past the default 2 MiB.
        // Raise the ceiling so the app-shell is still fully precached for offline use.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
