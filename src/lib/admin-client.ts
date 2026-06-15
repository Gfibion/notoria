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
  const { data, error } = await supabase.functions.invoke<any>(fn, {
    body: { ...body, ...devicePayload() },
  });
  if (error) {
    // FunctionsHttpError exposes the response on .context
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        const err = new Error(parsed?.error || error.message);
        (err as any).code = parsed?.code;
        throw err;
      } catch (e) {
        if (e instanceof Error && (e as any).code !== undefined) throw e;
      }
    }
    throw new Error(error.message || `${fn} failed`);
  }
  if (data && data.error) {
    const err = new Error(data.error);
    (err as any).code = data.code;
    throw err;
  }
  if (!data) throw new Error(`${fn} returned empty`);
  return data as T;
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
  coffeeStats: () => call<{
    ok: true;
    stats: {
      totalSupports: number;
      uniqueSupporters: number;
      last30DaysCount: number;
      byCurrency: Record<string, { count: number; amount: number }>;
    };
    recent: Array<{
      id: string;
      checkout_id: string;
      product_name: string | null;
      amount: number | null;
      currency: string | null;
      status: string;
      customer_email: string | null;
      created_at: string;
    }>;
  }>("admin-coffee-stats"),
  ticketsList: () => call<{ ok: true; tickets: any[] }>("admin-tickets-list"),
  ticketGet: (ticketId: string) => call<{ ok: true; ticket: any; messages: any[] }>("admin-ticket-get", { ticketId }),
  ticketReply: (ticketId: string, body: string, setStatus?: string) =>
    call<{ ok: true }>("admin-ticket-reply", { ticketId, body, setStatus }),
  ticketStatus: (ticketId: string, status: string) =>
    call<{ ok: true }>("admin-ticket-status", { ticketId, status }),
  faqsList: () => call<{ ok: true; faqs: any[] }>("admin-faqs-list"),
  faqUpsert: (p: { id?: string; question: string; answer: string; published?: boolean; sortOrder?: number; sourceTicketId?: string }) =>
    call<{ ok: true; id: string }>("admin-faq-upsert", p),
  faqDelete: (id: string) => call<{ ok: true }>("admin-faq-delete", { id }),
};
