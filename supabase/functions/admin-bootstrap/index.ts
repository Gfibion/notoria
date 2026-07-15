// Returns the caller's admin status, escrow presence, device binding info,
// and WebAuthn verification state. Does NOT enforce device match or WebAuthn —
// the UI uses this to decide whether to show the biometric step-up screen.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

const WEBAUTHN_MAX_AGE_MS = 12 * 60 * 60 * 1000;

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
    claimed_at: string; last_seen_at: string; webauthn_verified_at: string | null;
  };
  let webauthnVerified = false;
  let hasPasskey = false;

  if (ctx.admin && ctx.device.device_id) {
    // Consume any pending passwordless verification handoff for this admin+device.
    const { data: pending } = await ctx.service
      .from("admin_webauthn_verifications")
      .select("id, expires_at")
      .eq("admin_id", ctx.admin.id)
      .eq("device_id", ctx.device.device_id)
      .is("consumed_at", null)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let pendingConsumed = false;
    if (pending) {
      await ctx.service
        .from("admin_webauthn_verifications")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", pending.id);
      pendingConsumed = true;
    }

    const { data: existing } = await ctx.service
      .from("admin_devices")
      .select("device_id, ip, user_agent, claimed_at, last_seen_at, webauthn_verified_at")
      .eq("admin_id", ctx.admin.id)
      .maybeSingle();

    if (!existing) {
      const now = new Date().toISOString();
      const claim = {
        admin_id: ctx.admin.id,
        device_id: ctx.device.device_id,
        ip: ctx.device.ip,
        user_agent: ctx.device.user_agent,
        webauthn_verified_at: pendingConsumed ? now : null,
      };
      await ctx.service.from("admin_devices").insert(claim);
      deviceAuthorized = true;
      currentDevice = { ...claim, claimed_at: now, last_seen_at: now };
    } else if (existing.device_id === ctx.device.device_id) {
      const patch: Record<string, unknown> = {
        last_seen_at: new Date().toISOString(),
        ip: ctx.device.ip,
        user_agent: ctx.device.user_agent,
      };
      if (pendingConsumed) patch.webauthn_verified_at = new Date().toISOString();
      await ctx.service.from("admin_devices").update(patch).eq("admin_id", ctx.admin.id);
      deviceAuthorized = true;
      currentDevice = {
        ...(existing as any),
        ip: ctx.device.ip,
        user_agent: ctx.device.user_agent,
        last_seen_at: new Date().toISOString(),
        webauthn_verified_at: pendingConsumed ? new Date().toISOString() : (existing as any).webauthn_verified_at,
      };
    } else {
      deviceAuthorized = false;
      currentDevice = existing as any;
    }

    const va = currentDevice?.webauthn_verified_at ? new Date(currentDevice.webauthn_verified_at).getTime() : 0;
    webauthnVerified = !!va && Date.now() - va < WEBAUTHN_MAX_AGE_MS;

    const { count: pkCount } = await ctx.service
      .from("admin_passkeys")
      .select("*", { count: "exact", head: true })
      .eq("admin_id", ctx.admin.id);
    hasPasskey = (pkCount ?? 0) > 0;
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
    webauthn: {
      verified: webauthnVerified,
      hasPasskey,
      maxAgeMs: WEBAUTHN_MAX_AGE_MS,
    },
  });
});
