// PWA install detection sensors
const INSTALLED_KEY = 'novaryn-pwa-installed';

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    if (window.matchMedia?.('(display-mode: fullscreen)').matches) return true;
    if (window.matchMedia?.('(display-mode: minimal-ui)').matches) return true;
    // iOS Safari
    if ((window.navigator as any).standalone === true) return true;
    // TWA / Android app referrer
    if (document.referrer.startsWith('android-app://')) return true;
  } catch {}
  return false;
}

export function hasEverInstalled(): boolean {
  try {
    return localStorage.getItem(INSTALLED_KEY) === '1';
  } catch {
    return false;
  }
}

export function markInstalled(): void {
  try {
    localStorage.setItem(INSTALLED_KEY, '1');
  } catch {}
}

export function clearInstalled(): void {
  try {
    localStorage.removeItem(INSTALLED_KEY);
  } catch {}
}

/**
 * Register install sensors globally. Call once at app boot.
 * - Marks installed when running in standalone display mode
 * - Marks installed when the browser fires `appinstalled`
 */
export function initInstallSensors(): void {
  if (typeof window === 'undefined') return;
  if (isStandalone()) markInstalled();
  window.addEventListener('appinstalled', () => markInstalled());
  // Watch for later transitions into standalone
  try {
    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) markInstalled();
    };
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else if ((mql as any).addListener) (mql as any).addListener(onChange);
  } catch {}
}
