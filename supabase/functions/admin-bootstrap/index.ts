// Returns the caller's admin status, escrow presence, and device binding info.
// Does NOT enforce device match — it reports status so the UI can show
// either the admin panel (authorized device) or the "authorize this device" flow.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req, { allowAnyAuthed: true, enforceDevice: false });
  if (ctx instanceof Response) return ctx;

  const { data: escrow } = await ctx.service
    .from("admin_escrow")
    .select("public_key_jwk, created_at")
    .maybeSingle();

  const { count: adminCount } = await ctx.service
    .from("admins")
    .select("*", { count: "exact", head: true });

  let deviceAuthorized = false;
  let currentDevice = null as null | {
    device_id: string; ip: string | null; user_agent: string | null;
    claimed_at: string; last_seen_at: string;
  };

  if (ctx.admin && ctx.device.device_id) {
    const { data: existing } = await ctx.service
      .from("admin_devices")
      .select("device_id, ip, user_agent, claimed_at, last_seen_at")
      .eq("admin_id", ctx.admin.id)
      .maybeSingle();

    if (!existing) {
      // First time this admin has touched a device — auto-claim.
      await ctx.service.from("admin_devices").insert({
        admin_id: ctx.admin.id,
        device_id: ctx.device.device_id,
        ip: ctx.device.ip,
        user_agent: ctx.device.user_agent,
      });
      deviceAuthorized = true;
      currentDevice = {
        device_id: ctx.device.device_id,
        ip: ctx.device.ip,
        user_agent: ctx.device.user_agent,
        claimed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      };
    } else if (existing.device_id === ctx.device.device_id) {
      await ctx.service.from("admin_devices").update({
        last_seen_at: new Date().toISOString(),
        ip: ctx.device.ip,
        user_agent: ctx.device.user_agent,
      }).eq("admin_id", ctx.admin.id);
      deviceAuthorized = true;
      currentDevice = { ...(existing as any), ip: ctx.device.ip, user_agent: ctx.device.user_agent, last_seen_at: new Date().toISOString() };
    } else {
      deviceAuthorized = false;
      currentDevice = existing as any;
    }
  }

  return json({
    ok: true,
    user: { id: ctx.userId, email: ctx.email },
    admin: ctx.admin,
    escrow: escrow ?? null,
    adminCount: adminCount ?? 0,
    device: {
      authorized: deviceAuthorized,
      current: currentDevice,
      mine: { device_id: ctx.device.device_id, ip: ctx.device.ip, user_agent: ctx.device.user_agent },
    },
  });
});
