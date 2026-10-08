// Classic plan (paid tier) configuration shared by edge functions.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export const CLASSIC_CURRENCY = "KES";
export const CLASSIC_PRICE_MAJOR = 1500; // KES per month
export const CLASSIC_PRICE_MINOR = CLASSIC_PRICE_MAJOR * 100;
export const CLASSIC_DAYS = 30;
export const CLASSIC_MAX_DEVICES = 3;

export const REGULAR_LIMITS = { messages: 50, images: 5 };
export const CLASSIC_LIMITS = { messages: 300, images: 30 };

export interface PlanInfo {
  plan: "regular" | "classic";
  expiresAt: string | null;
}

/** Plan for a device owner_key (sha256 of device id). */
export async function planForDevice(service: SupabaseClient, ownerKey: string): Promise<PlanInfo> {
  const { data: dev } = await service
    .from("classic_devices").select("user_hash").eq("owner_key", ownerKey).maybeSingle();
  if (!dev?.user_hash) return { plan: "regular", expiresAt: null };
  return planForHash(service, dev.user_hash as string);
}

export async function planForHash(service: SupabaseClient, userHash: string): Promise<PlanInfo> {
  const { data: sub } = await service
    .from("classic_subscriptions").select("expires_at").eq("user_hash", userHash).maybeSingle();
  const exp = sub?.expires_at as string | undefined;
  if (exp && new Date(exp).getTime() > Date.now()) return { plan: "classic", expiresAt: exp };
  return { plan: "regular", expiresAt: exp ?? null };
}
