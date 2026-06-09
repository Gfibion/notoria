import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminInfo {
  user: { id: string; email: string };
  admin: { id: string; user_id: string; email: string; role: "master" | "invited" } | null;
  escrow: { public_key_jwk: JsonWebKey; created_at: string } | null;
  adminCount: number;
}

async function call<T>(fn: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) throw new Error(error.message || `${fn} failed`);
  if (!data) throw new Error(`${fn} returned empty`);
  return data;
}

export function useAdmin() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<unknown>(null);
  const [info, setInfo] = useState<AdminInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    if (!s) { setInfo(null); setLoading(false); return; }
    try {
      const res = await call<AdminInfo & { ok: true }>("admin-bootstrap");
      setInfo(res);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load admin info");
      setInfo(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => { refresh(); });
    refresh();
    return () => { sub.subscription.unsubscribe(); };
  }, [refresh]);

  return { loading, session, info, error, refresh };
}

export const adminApi = {
  stats: () => call<{ ok: true; stats: any }>("admin-stats"),
  users: () => call<{ ok: true; users: any[] }>("admin-users"),
  createInvite: (email: string) => call<{ ok: true; token: string; email: string }>("admin-create-invite", { email }),
  acceptInvite: (token: string) => call<{ ok: true }>("admin-accept-invite", { token }),
  setEscrow: (publicKeyJwk: JsonWebKey) => call<{ ok: true }>("admin-set-escrow", { publicKeyJwk }),
  recover: (userHash: string) => call<{ ok: true; userHash: string; wrappedKey: string | null; notes: any[]; recoverable: boolean }>("admin-recover", { userHash }),
};
