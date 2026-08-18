/*
 * Web Share Target handler for Novaryn.
 * The OS posts a shared PDF to /share-pdf; we stash it in a dedicated cache and
 * redirect the app to /app?shared-pdf=1 so the client can pick it up.
 */
/* eslint-disable no-undef */
const NOVARYN_SHARE_CACHE = "novaryn-shared-files";
const NOVARYN_SHARE_KEY = "/__novaryn_shared_pdf";

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/share-pdf") return;

  event.respondWith(
    (async () => {
      try {
        const formData = await event.request.formData();
        const file = formData.get("file");
        if (file && file.type === "application/pdf") {
          const cache = await caches.open(NOVARYN_SHARE_CACHE);
          await cache.put(
            NOVARYN_SHARE_KEY,
            new Response(file, {
              headers: {
                "content-type": "application/pdf",
                "x-novaryn-filename": encodeURIComponent(file.name || "shared.pdf"),
              },
            }),
          );
          return Response.redirect("/app?shared-pdf=1", 303);
        }
      } catch (err) {
        // fall through to a plain app launch
      }
      return Response.redirect("/app", 303);
    })(),
  );
});
