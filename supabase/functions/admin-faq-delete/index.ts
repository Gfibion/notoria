import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const id = String(ctx.body.id ?? "").trim();
  if (!id) return json({ error: "Missing id" }, 400);
  const { error } = await ctx.service.from("faqs").delete().eq("id", id);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
