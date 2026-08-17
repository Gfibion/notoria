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
  // 8-digit, no leading zero, cryptographically random
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(10000000 + (buf[0] % 90000000));
}
function genToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_TICKETS_PER_IP_PER_HOUR = 3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
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
    if (contactEmail && !EMAIL_RE.test(contactEmail)) return json({ error: "Invalid email address" }, 400);
    if (userHash && !/^[A-Za-z0-9_-]+$/.test(userHash)) return json({ error: "Invalid user reference" }, 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Abuse protection: max N tickets per IP per hour. IP is stored only as a hash.
    const ipHash = await sha256Hex("ticket:" + clientIp(req));
    const { data: allowed, error: rlErr } = await service.rpc("bump_rate_limit", {
      _bucket: "contact_create_ticket",
      _subject: ipHash,
      _limit: MAX_TICKETS_PER_IP_PER_HOUR,
    });
    if (rlErr || allowed !== true) {
      if (rlErr) console.error("rate limit check failed", rlErr);
      return json({ error: "Too many tickets created. Please try again in an hour." }, 429);
    }


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
