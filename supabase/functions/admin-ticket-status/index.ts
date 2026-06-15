import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

const ALLOWED = ["open", "in_progress", "resolved", "closed"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;
  const ticketId = String(ctx.body.ticketId ?? "").trim();
  const status = String(ctx.body.status ?? "").trim();
  if (!ticketId || !ALLOWED.includes(status)) return json({ error: "Invalid input" }, 400);

  const { error } = await ctx.service.from("tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);
  if (error) return json({ error: error.message }, 500);
  return json({ ok: true });
});
