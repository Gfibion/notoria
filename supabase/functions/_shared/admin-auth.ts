// Shared helper: verify caller is an admin (or master admin) and bind their device.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export interface AdminRow {
  id: string;
  user_id: string;
  email: string;
  role: "master" | "invited";
}

export interface DeviceInfo {
  device_id: string;
  ip: string;
  user_agent: string;
}

export interface CurrentDeviceRow {
  device_id: string;
  ip: string | null;
  user_agent: string | null;
  claimed_at: string;
  last_seen_at: string;
}

export interface AdminContext {
  userId: string;
  email: string;
  admin: AdminRow | null;
  service: SupabaseClient;
  body: Record<string, unknown>;
  device: DeviceInfo;
  /** Set when enforceDevice was checked. */
  deviceAuthorized?: boolean;
  /** The currently-bound device for the admin (after potential auto-claim). */
  currentDevice?: CurrentDeviceRow | null;
}

function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const cloned = req.clone();
    const txt = await cloned.text();
    if (!txt) return {};
    return JSON.parse(txt);
  } catch {
    return {};
  }
}

function extractDevice(req: Request, body: Record<string, unknown>): DeviceInfo {
  const dev = (body?._device ?? {}) as Record<string, unknown>;
  const headerId = req.headers.get("x-admin-device-id") ?? "";
  const device_id = String(dev.id ?? headerId ?? "").trim();
  const user_agent = String(dev.ua ?? req.headers.get("user-agent") ?? "").slice(0, 300);
  const ip = extractIp(req);
  return { device_id, ip, user_agent };
}

export interface RequireAdminOpts {
  requireMaster?: boolean;
  allowAnyAuthed?: boolean;
  /** If true (default when admin), enforce that the request's device matches the admin's bound device. */
  enforceDevice?: boolean;
  /** If true, auto-claim the device when no binding exists yet. */
  autoClaim?: boolean;
  /** If true (default when admin & enforceDevice), require a fresh WebAuthn verification on this device. */
  requireWebauthn?: boolean;
  /** Max age (ms) of the WebAuthn verification. Default 12h. */
  webauthnMaxAgeMs?: number;
}

/**
 * Validates the bearer JWT, parses body, extracts device info, and (by default)
 * enforces that the admin is operating from their bound device.
 */
export async function requireAdmin(
  req: Request,
  opts: RequireAdminOpts = {},
): Promise<AdminContext | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const token = authHeader.slice(7);
  const { data: userData, error: userErr } = await service.auth.getUser(token);
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

  const userId = userData.user.id;
  const email = userData.user.email ?? "";

  const body = await readBody(req);
  const device = extractDevice(req, body);

  const { data: admin } = await service
    .from("admins")
    .select("id, user_id, email, role")
    .eq("user_id", userId)
    .maybeSingle();

  if (!admin && !opts.allowAnyAuthed) return json({ error: "Forbidden" }, 403);
  if (opts.requireMaster && admin?.role !== "master") return json({ error: "Master admin only" }, 403);

  const ctx: AdminContext = {
    userId, email, admin: admin as AdminRow | null, service, body, device,
  };

  // Device enforcement defaults to ON when the caller is an admin.
  const enforce = opts.enforceDevice ?? !!admin;
  if (enforce && admin) {
    if (!device.device_id) return json({ error: "Missing device id", code: "device_missing" }, 400);

    const { data: current } = await service
      .from("admin_devices")
      .select("device_id, ip, user_agent, claimed_at, last_seen_at")
      .eq("admin_id", admin.id)
      .maybeSingle();

    if (!current) {
      if (opts.autoClaim === false) {
        ctx.deviceAuthorized = false;
        ctx.currentDevice = null;
      } else {
        const claimed: CurrentDeviceRow = {
          device_id: device.device_id,
          ip: device.ip,
          user_agent: device.user_agent,
          claimed_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        };
        await service.from("admin_devices").insert({
          admin_id: admin.id,
          device_id: device.device_id,
          ip: device.ip,
          user_agent: device.user_agent,
        });
        ctx.deviceAuthorized = true;
        ctx.currentDevice = claimed;
      }
    } else if (current.device_id === device.device_id) {
      // Touch last_seen + refresh ip/ua
      await service.from("admin_devices").update({
        last_seen_at: new Date().toISOString(),
        ip: device.ip,
        user_agent: device.user_agent,
      }).eq("admin_id", admin.id);
      ctx.deviceAuthorized = true;
      ctx.currentDevice = { ...current, ip: device.ip, user_agent: device.user_agent, last_seen_at: new Date().toISOString() };
    } else {
      ctx.deviceAuthorized = false;
      ctx.currentDevice = current as CurrentDeviceRow;
      return json({
        error: "This device is not authorized for the admin panel. Generate a one-time link from your authorized device to bind this one.",
        code: "device_not_authorized",
      }, 403);
    }

    // Enforce fresh WebAuthn step-up (default ON for admins).
    const requireWa = opts.requireWebauthn ?? true;
    if (requireWa) {
      const maxAge = opts.webauthnMaxAgeMs ?? 12 * 60 * 60 * 1000;
      const { data: dev } = await service
        .from("admin_devices")
        .select("webauthn_verified_at")
        .eq("admin_id", admin.id)
        .maybeSingle();
      const verifiedAt = dev?.webauthn_verified_at ? new Date(dev.webauthn_verified_at).getTime() : 0;
      if (!verifiedAt || Date.now() - verifiedAt > maxAge) {
        // Does this admin have any passkey registered?
        const { count } = await service
          .from("admin_passkeys")
          .select("*", { count: "exact", head: true })
          .eq("admin_id", admin.id);
        return json({
          error: "Biometric verification required.",
          code: "webauthn_required",
          hasPasskey: (count ?? 0) > 0,
        }, 401);
      }
    }
  }

  return ctx;
}

/** Claim/replace the device binding for an admin (server-side helper). */
export async function bindAdminDevice(
  service: SupabaseClient,
  adminId: string,
  device: DeviceInfo,
) {
  await service.from("admin_devices").upsert({
    admin_id: adminId,
    device_id: device.device_id,
    ip: device.ip,
    user_agent: device.user_agent,
    claimed_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
  }, { onConflict: "admin_id" });
}
