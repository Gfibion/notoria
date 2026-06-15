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
    if (!ticketNumber || !accessToken) return json({ error: "Missing credentials" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: ticket, error } = await service
      .from("tickets")
      .select("id, ticket_number, reason, subject, status, contact_email, created_at, updated_at, access_token")
      .eq("ticket_number", ticketNumber)
      .maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!ticket || ticket.access_token !== accessToken) return json({ error: "Not found" }, 404);

    const { data: messages } = await service
      .from("ticket_messages")
      .select("id, sender, body, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    const { access_token: _omit, id: _id, ...safe } = ticket as any;
    return json({ ok: true, ticket: safe, messages: messages ?? [] });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
