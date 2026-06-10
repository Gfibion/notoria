// Redeem a one-time device-transfer token from a NEW device. The caller
// must be signed in as the same admin user. On success the admin's bound
// device is replaced with the current device — the old device immediately
// loses admin access.
import { requireAdmin, bindAdminDevice, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Do NOT enforce device match — that's exactly what we're transferring.
  const ctx = await requireAdmin(req, { enforceDevice: false });
  if (ctx instanceof Response) return ctx;
  if (!ctx.admin) return json({ error: "Admin only" }, 403);
  if (!ctx.device.device_id) return json({ error: "Missing device id" }, 400);

  const token = String((ctx.body?.token ?? "")).trim();
  if (!token) return json({ error: "Token required" }, 400);

  const { data: link } = await ctx.service
    .from("admin_device_links")
    .select("token, admin_id, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (!link) return json({ error: "Invalid link" }, 400);
  if (link.used_at) return json({ error: "Link already used" }, 400);
  if (new Date(link.expires_at) < new Date()) return json({ error: "Link expired" }, 400);
  if (link.admin_id !== ctx.admin.id) {
    return json({ error: "This link belongs to a different admin account" }, 403);
  }

  await bindAdminDevice(ctx.service, ctx.admin.id, ctx.device);
  await ctx.service
    .from("admin_device_links")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  return json({ ok: true });
});
