// Classic plan status + device binding. The caller proves Cloud ID ownership
// with the user_hash derived locally from their secret key (same model as backups).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkRateLimit, sha256Hex } from "../_shared/rate-limit.ts";
import {
  CLASSIC_CURRENCY, CLASSIC_DAYS, CLASSIC_LIMITS, CLASSIC_MAX_DEVICES, CLASSIC_PRICE_MAJOR,
  REGULAR_LIMITS, planForDevice, planForHash,
} from "../_shared/classic.ts";

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
  const rl = await checkRateLimit(service, req, "classic_plan", 120);
  if (!rl.allowed) return json({ error: rl.message }, 429);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action ?? "status");
  const deviceId = typeof body.device_id === "string" ? body.device_id.slice(0, 200) : "";
  if (!deviceId) return json({ error: "Missing device identity" }, 400);
  const ownerKey = await sha256Hex(deviceId);
  const userHash = typeof body.user_hash === "string" ? body.user_hash : "";
  if (userHash && !/^[a-f0-9]{64}$/.test(userHash)) return json({ error: "Invalid user_hash" }, 400);

  const info = {
    price: CLASSIC_PRICE_MAJOR, currency: CLASSIC_CURRENCY, days: CLASSIC_DAYS,
    maxDevices: CLASSIC_MAX_DEVICES, regularLimits: REGULAR_LIMITS, classicLimits: CLASSIC_LIMITS,
  };

  const devicesFor = async (h: string) => {
    const { data } = await service.from("classic_devices")
      .select("owner_key, label, bound_at, last_seen_at").eq("user_hash", h).order("bound_at");
    return (data ?? []).map((d) => ({
      id: (d.owner_key as string).slice(0, 10),
      label: d.label, boundAt: d.bound_at, lastSeenAt: d.last_seen_at,
      thisDevice: d.owner_key === ownerKey,
    }));
  };

  if (action === "status") {
    const devicePlan = await planForDevice(service, ownerKey);
    const { data: dev } = await service.from("classic_devices").select("user_hash").eq("owner_key", ownerKey).maybeSingle();
    let key = null as null | { plan: string; expiresAt: string | null; devices: unknown[]; deviceBoundHere: boolean };
    if (userHash) {
      const p = await planForHash(service, userHash);
      key = { ...p, devices: await devicesFor(userHash), deviceBoundHere: dev?.user_hash === userHash };
    }
    return json({ ok: true, info, device: { ...devicePlan, bound: Boolean(dev) }, key });
  }

  if (!userHash) return json({ error: "Unlock your Cloud ID first" }, 400);

  if (action === "bind") {
    const p = await planForHash(service, userHash);
    if (p.plan !== "classic") return json({ error: "This Cloud ID has no active Classic plan" }, 403);
    const { data: existing } = await service.from("classic_devices").select("user_hash").eq("owner_key", ownerKey).maybeSingle();
    if (existing?.user_hash !== userHash) {
      const { count } = await service.from("classic_devices")
        .select("owner_key", { count: "exact", head: true }).eq("user_hash", userHash);
      if ((count ?? 0) >= CLASSIC_MAX_DEVICES) {
        return json({ error: `This key is already bound to ${CLASSIC_MAX_DEVICES} devices. Remove one first.`, code: "device_limit" }, 409);
      }
    }
    const label = typeof body.label === "string" ? body.label.slice(0, 80) : null;
    const { error } = await service.from("classic_devices").upsert({
      owner_key: ownerKey, user_hash: userHash, label, last_seen_at: new Date().toISOString(),
    }, { onConflict: "owner_key" });
    if (error) return json({ error: "Could not bind this device" }, 500);
    return json({ ok: true, devices: await devicesFor(userHash) });
  }

  if (action === "unbind") {
    const target = typeof body.target === "string" ? body.target : "";
    if (!/^[a-f0-9]{10}$/.test(target)) return json({ error: "Invalid device" }, 400);
    const { data } = await service.from("classic_devices").select("owner_key").eq("user_hash", userHash);
    const match = (data ?? []).find((d) => (d.owner_key as string).startsWith(target));
    if (!match) return json({ error: "Device not found" }, 404);
    await service.from("classic_devices").delete().eq("owner_key", match.owner_key).eq("user_hash", userHash);
    return json({ ok: true, devices: await devicesFor(userHash) });
  }

  return json({ error: "Unknown action" }, 400);
});
