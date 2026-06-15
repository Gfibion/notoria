import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const ticketNumber = String(body.ticketNumber ?? "").trim();
    const accessToken = String(body.accessToken ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    if (!ticketNumber || !accessToken) return json({ error: "Missing credentials" }, 400);
    if (messageBody.length < 1 || messageBody.length > 5000) return json({ error: "Message must be 1–5000 chars" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ticket } = await service
      .from("tickets")
      .select("id, access_token, status")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (!ticket || ticket.access_token !== accessToken) return json({ error: "Not found" }, 404);
    if (ticket.status === "closed") return json({ error: "Ticket is closed" }, 400);

    const { error } = await service.from("ticket_messages").insert({
      ticket_id: ticket.id, sender: "user", body: messageBody,
    });
    if (error) return json({ error: error.message }, 500);

    // Reopen if resolved, bump updated_at
    const nextStatus = ticket.status === "resolved" ? "open" : ticket.status;
    await service.from("tickets").update({ status: nextStatus, updated_at: new Date().toISOString() }).eq("id", ticket.id);

    return json({ ok: true });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
