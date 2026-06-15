import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const REASONS = new Set(["issue", "concern", "recommend", "other"]);

function genTicketNumber(): string {
  // 8-digit, no leading zero
  const n = 10000000 + Math.floor(Math.random() * 90000000);
  return String(n);
}
function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const reason = String(body.reason ?? "").toLowerCase();
    const subject = String(body.subject ?? "").trim();
    const messageBody = String(body.body ?? "").trim();
    const contactEmail = body.contactEmail ? String(body.contactEmail).trim().slice(0, 255) : null;
    const userHash = body.userHash ? String(body.userHash).trim().slice(0, 128) : null;

    if (!REASONS.has(reason)) return json({ error: "Invalid reason" }, 400);
    if (subject.length < 3 || subject.length > 200) return json({ error: "Subject must be 3–200 chars" }, 400);
    if (messageBody.length < 5 || messageBody.length > 5000) return json({ error: "Message must be 5–5000 chars" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Try a few times in the (very unlikely) case of ticket_number collision.
    let ticketNumber = "";
    let ticketId = "";
    const accessToken = genToken();
    for (let i = 0; i < 5; i++) {
      const candidate = genTicketNumber();
      const { data, error } = await service.from("tickets").insert({
        ticket_number: candidate,
        access_token: accessToken,
        reason, subject,
        user_hash: userHash,
        contact_email: contactEmail,
      }).select("id, ticket_number").maybeSingle();
      if (!error && data) { ticketNumber = data.ticket_number; ticketId = data.id; break; }
      if (error && !String(error.message).includes("duplicate")) return json({ error: error.message }, 500);
    }
    if (!ticketId) return json({ error: "Could not allocate ticket number" }, 500);

    const { error: mErr } = await service.from("ticket_messages").insert({
      ticket_id: ticketId, sender: "user", body: messageBody,
    });
    if (mErr) return json({ error: mErr.message }, 500);

    return json({ ok: true, ticketNumber, accessToken });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
