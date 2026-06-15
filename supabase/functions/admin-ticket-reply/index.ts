import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const ticketId = String(ctx.body.ticketId ?? "").trim();
  const body = String(ctx.body.body ?? "").trim();
  const setStatus = ctx.body.setStatus ? String(ctx.body.setStatus) : null;
  if (!ticketId) return json({ error: "Missing ticketId" }, 400);
  if (body.length < 1 || body.length > 5000) return json({ error: "Message must be 1–5000 chars" }, 400);

  const { error } = await ctx.service.from("ticket_messages").insert({
    ticket_id: ticketId, sender: "admin", body,
  });
  if (error) return json({ error: error.message }, 500);

  const next = setStatus && ["open", "in_progress", "resolved", "closed"].includes(setStatus)
    ? setStatus : "in_progress";
  await ctx.service.from("tickets").update({ status: next, updated_at: new Date().toISOString() }).eq("id", ticketId);

  return json({ ok: true });
});
