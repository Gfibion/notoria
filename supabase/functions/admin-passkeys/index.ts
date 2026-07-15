// List / delete passkeys for the current admin.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.admin) return json({ error: "Admin only" }, 403);

  const action = String(ctx.body?.action ?? "list");

  if (action === "list") {
    const { data } = await ctx.service
      .from("admin_passkeys")
      .select("id, credential_id, nickname, device_type, backed_up, transports, created_at, last_used_at")
      .eq("admin_id", ctx.admin.id)
      .order("created_at", { ascending: false });
    return json({ ok: true, passkeys: data ?? [] });
  }

  if (action === "delete") {
    const id = String(ctx.body?.id ?? "");
    if (!id) return json({ error: "id required" }, 400);
    // Prevent deleting the last passkey — leaves admin without step-up.
    const { count } = await ctx.service
      .from("admin_passkeys")
      .select("*", { count: "exact", head: true })
      .eq("admin_id", ctx.admin.id);
    if ((count ?? 0) <= 1) return json({ error: "Cannot remove your only passkey" }, 400);

    const { error } = await ctx.service
      .from("admin_passkeys")
      .delete()
      .eq("id", id)
      .eq("admin_id", ctx.admin.id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  if (action === "rename") {
    const id = String(ctx.body?.id ?? "");
    const nickname = String(ctx.body?.nickname ?? "").slice(0, 80);
    if (!id) return json({ error: "id required" }, 400);
    const { error } = await ctx.service
      .from("admin_passkeys")
      .update({ nickname: nickname || null })
      .eq("id", id)
      .eq("admin_id", ctx.admin.id);
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
