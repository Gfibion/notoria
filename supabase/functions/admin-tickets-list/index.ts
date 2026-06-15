import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const { data: tickets, error } = await ctx.service
    .from("tickets")
    .select("id, ticket_number, reason, subject, status, contact_email, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return json({ error: error.message }, 500);

  const ids = (tickets ?? []).map(t => t.id);
  let counts: Record<string, number> = {};
  let lastSender: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: msgs } = await ctx.service
      .from("ticket_messages")
      .select("ticket_id, sender, created_at")
      .in("ticket_id", ids)
      .order("created_at", { ascending: true });
    for (const m of (msgs ?? [])) {
      counts[m.ticket_id] = (counts[m.ticket_id] ?? 0) + 1;
      lastSender[m.ticket_id] = m.sender;
    }
  }
  const enriched = (tickets ?? []).map(t => ({
    ...t, message_count: counts[t.id] ?? 0, last_sender: lastSender[t.id] ?? null,
  }));
  return json({ ok: true, tickets: enriched });
});
