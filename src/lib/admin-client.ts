import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEVICE_ID_KEY = "notoria_admin_device_id";

export function getAdminDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = (crypto as any).randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return "ephemeral-" + Math.random().toString(36).slice(2);
  }
}

export interface AdminDeviceInfo {
  device_id: string;
  ip: string | null;
  user_agent: string | null;
  claimed_at?: string;
  last_seen_at?: string;
}

export interface AdminInfo {
  user: { id: string; email: string };
  admin: { id: string; user_id: string; email: string; role: "master" | "invited" } | null;
  escrow: { public_key_jwk: JsonWebKey; created_at: string } | null;
  adminCount: number;
  device: {
    authorized: boolean;
    current: AdminDeviceInfo | null;
    mine: AdminDeviceInfo;
  };
}

function devicePayload() {
  return {
    _device: {
      id: getAdminDeviceId(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
    },
  };
}

async function call<T>(fn: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, {
    body: { ...body, ...devicePayload() },
  });
  if (error) {
    // Try to surface error.code for device_not_authorized
    const ctx = (error as any).context;
    if (ctx?.body) {
      try {
        const parsed = JSON.parse(await ctx.body.text?.() ?? ctx.body);
        const e = new Error(parsed.error || error.message);
        (e as any).code = parsed.code;
        throw e;
      } catch (parseErr) {
        if (parseErr instanceof Error && (parseErr as any).code) throw parseErr;
      }
    }
    throw new Error(error.message || `${fn} failed`);
  }
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
  createDeviceLink: () => call<{ ok: true; token: string; expiresInMinutes: number }>("admin-create-device-link"),
  redeemDeviceLink: (token: string) => call<{ ok: true }>("admin-redeem-device-link", { token }),
};
