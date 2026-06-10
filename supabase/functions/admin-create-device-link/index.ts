// Admin (operating from their authorized device) creates a one-time magic link
// that the SAME admin can redeem on a new device to transfer the binding.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req); // enforces device by default
  if (ctx instanceof Response) return ctx;
  if (!ctx.admin) return json({ error: "Admin only" }, 403);

  // Clear any unused previous links for this admin
  await ctx.service
    .from("admin_device_links")
    .delete()
    .eq("admin_id", ctx.admin.id)
    .is("used_at", null);

  const token = randomToken();
  const { error } = await ctx.service.from("admin_device_links").insert({
    token,
    admin_id: ctx.admin.id,
    created_by_device: ctx.device.device_id,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, token, expiresInMinutes: 15 });
});
