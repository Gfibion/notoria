import * as React from "react";
import { getSettings } from "@/lib/db";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);
  const [layoutOverride, setLayoutOverride] = React.useState<'auto' | 'desktop' | 'mobile'>('auto');

  // Listen for layout setting changes
  React.useEffect(() => {
    const loadLayout = () => {
      getSettings().then(s => setLayoutOverride(s.uiLayout || 'auto'));
    };
    loadLayout();

    // Listen for custom event when settings change
    window.addEventListener('layout-setting-changed', loadLayout);
    return () => window.removeEventListener('layout-setting-changed', loadLayout);
  }, []);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  if (layoutOverride === 'mobile') return true;
  if (layoutOverride === 'desktop') return false;
  return !!isMobile;
}
