import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface IsAdminResult {
  isAdmin: boolean;
  isMaster: boolean;
  loading: boolean;
}

export function useIsAdmin(): IsAdminResult {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsAdmin(false);
        setIsMaster(false);
        return;
      }
      const { data, error } = await supabase
        .from("admins")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (error || !data) {
        setIsAdmin(false);
        setIsMaster(false);
        return;
      }
      setIsAdmin(true);
      setIsMaster(data.role === "master");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [check]);

  return { isAdmin, isMaster, loading };
}
