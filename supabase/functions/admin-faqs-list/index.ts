import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const { data, error } = await ctx.service
    .from("faqs")
    .select("id, question, answer, published, sort_order, source_ticket_id, created_at, updated_at")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true, faqs: data ?? [] });
});
