import { supabase } from "@/integrations/supabase/client";
import { getAdminDeviceId } from "@/lib/admin-client";

export interface ClassicDevice {
  id: string;
  label: string | null;
  boundAt: string;
  lastSeenAt: string;
  thisDevice: boolean;
}

export interface ClassicStatus {
  ok: true;
  info: {
    price: number;
    currency: string;
    days: number;
    maxDevices: number;
    regularLimits: { messages: number; images: number };
    classicLimits: { messages: number; images: number };
  };
  device: { plan: "regular" | "classic"; expiresAt: string | null; bound: boolean };
  key: null | {
    plan: "regular" | "classic";
    expiresAt: string | null;
    devices: ClassicDevice[];
    deviceBoundHere: boolean;
  };
}

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("classic-plan", {
    body: { ...body, device_id: getAdminDeviceId() },
  });
  if (error) {
    let msg = error.message || "Request failed";
    const ctx = (error as { context?: Response }).context;
    if (ctx) {
      const parsed = await ctx.json().catch(() => null);
      if (parsed?.error) msg = String(parsed.error);
    }
    throw new Error(msg);
  }
  return data as T;
}

export function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS"
    : /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "Mac" : /Linux/i.test(ua) ? "Linux" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
}

export const classicApi = {
  status: (userHash?: string) => call<ClassicStatus>({ action: "status", ...(userHash ? { user_hash: userHash } : {}) }),
  bind: (userHash: string) =>
    call<{ ok: true; devices: ClassicDevice[] }>({ action: "bind", user_hash: userHash, label: deviceLabel() }),
  unbind: (userHash: string, target: string) =>
    call<{ ok: true; devices: ClassicDevice[] }>({ action: "unbind", user_hash: userHash, target }),
};
