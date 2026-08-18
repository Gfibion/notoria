/**
 * "Open with Novaryn" support for PDFs.
 *
 * Two OS entry points feed this module:
 *  - File Handling API (`window.launchQueue`) — desktop "Open with" menus.
 *  - Web Share Target — Android share sheet; the service worker stashes the
 *    file in a cache and navigates to /app?shared-pdf=1.
 */

const SHARE_CACHE = 'novaryn-shared-files';
const SHARE_KEY = '/__novaryn_shared_pdf';

async function takeSharedPdf(): Promise<File | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(SHARE_CACHE);
    const res = await cache.match(SHARE_KEY);
    if (!res) return null;
    await cache.delete(SHARE_KEY);
    const blob = await res.blob();
    const raw = res.headers.get('x-novaryn-filename') || 'shared.pdf';
    let name = 'shared.pdf';
    try {
      name = decodeURIComponent(raw);
    } catch {
      name = raw;
    }
    return new File([blob], name, { type: 'application/pdf' });
  } catch {
    return null;
  }
}

/**
 * Registers listeners for externally opened PDFs.
 * Returns a cleanup function.
 */
export function listenForExternalPdf(onFile: (file: File) => void): () => void {
  let cancelled = false;

  const deliver = (file: File | null | undefined) => {
    if (!cancelled && file && file.type === 'application/pdf') onFile(file);
  };

  // Share target (Android) — the SW redirects here with a marker param.
  const params = new URLSearchParams(window.location.search);
  if (params.get('shared-pdf')) {
    params.delete('shared-pdf');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    void takeSharedPdf().then(deliver);
  } else {
    // A warm client navigated by the SW may still have a pending file.
    void takeSharedPdf().then(deliver);
  }

  // File Handling API (desktop "Open with").
  const launchQueue = (window as any).launchQueue;
  if (launchQueue && typeof launchQueue.setConsumer === 'function') {
    launchQueue.setConsumer(async (launchParams: any) => {
      if (!launchParams?.files?.length) return;
      for (const handle of launchParams.files) {
        try {
          const file = await handle.getFile();
          deliver(file);
          break;
        } catch {
          /* ignore unreadable handles */
        }
      }
    });
  }

  return () => {
    cancelled = true;
  };
}
