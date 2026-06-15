import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const ticketId = String(ctx.body.ticketId ?? "").trim();
  if (!ticketId) return json({ error: "Missing ticketId" }, 400);

  const { data: ticket, error } = await ctx.service
    .from("tickets")
    .select("id, ticket_number, reason, subject, status, contact_email, user_hash, created_at, updated_at")
    .eq("id", ticketId).maybeSingle();
  if (error) return json({ error: error.message }, 500);
  if (!ticket) return json({ error: "Not found" }, 404);

  const { data: messages } = await ctx.service
    .from("ticket_messages")
    .select("id, sender, body, created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  return json({ ok: true, ticket, messages: messages ?? [] });
});
