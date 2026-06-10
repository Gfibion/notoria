import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminDeviceId } from "@/lib/admin-client";

export interface IsAdminResult {
  isAdmin: boolean;
  isMaster: boolean;
  deviceAuthorized: boolean;
  loading: boolean;
}

/**
 * Returns admin status for the current session AND the device binding.
 * The Admin link/UI should only render when isAdmin && deviceAuthorized.
 * Calls admin-bootstrap (which auto-claims the first device).
 */
export function useIsAdmin(): IsAdminResult {
  const [state, setState] = useState<IsAdminResult>({
    isAdmin: false, isMaster: false, deviceAuthorized: false, loading: true,
  });

  const check = useCallback(async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState({ isAdmin: false, isMaster: false, deviceAuthorized: false, loading: false });
        return;
      }
      const { data, error } = await supabase.functions.invoke("admin-bootstrap", {
        body: { _device: { id: getAdminDeviceId(), ua: navigator.userAgent.slice(0, 300) } },
      });
      if (error || !data?.ok) {
        setState({ isAdmin: false, isMaster: false, deviceAuthorized: false, loading: false });
        return;
      }
      const admin = data.admin;
      setState({
        isAdmin: !!admin,
        isMaster: admin?.role === "master",
        deviceAuthorized: !!data.device?.authorized,
        loading: false,
      });
    } catch {
      setState({ isAdmin: false, isMaster: false, deviceAuthorized: false, loading: false });
    }
  }, []);

  useEffect(() => {
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => { check(); });
    return () => { sub.subscription.unsubscribe(); };
  }, [check]);

  return state;
}
