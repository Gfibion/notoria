import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { runMigrationIfNeeded } from "./lib/watermelon/migrate-from-indexeddb";


/**
 * Boot sequence:
 *  1. Run the one-shot IndexedDB → WatermelonDB migration if it hasn't
 *     already completed. Errors are logged but never block the app from
 *     mounting — the legacy data is not touched, so a failed migration
 *     just means the next boot will retry.
 *  2. Render the app.
 */
async function boot() {
  try {
    const result = await runMigrationIfNeeded((stage) => {
      // eslint-disable-next-line no-console
      console.info("[notoria] migration:", stage);
    });
    if (result.ran) {
      // eslint-disable-next-line no-console
      console.info("[notoria] WatermelonDB migration complete", result.counts);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[notoria] migration failed to launch", err);
  }
  createRoot(document.getElementById("root")!).render(
    <HelmetProvider>
      <App />
    </HelmetProvider>
  );

}

void boot();
