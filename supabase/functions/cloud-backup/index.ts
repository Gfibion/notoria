// Cloud backup endpoint — stores end-to-end-encrypted notes.
// Identity model: a single Cloud ID (the user's secret) is BOTH the identity and
// the encryption key. The server only ever stores SHA-256(cloudId + ":auth") as
// user_hash and never sees plaintext or the Cloud ID itself.
// There is no escrow and no recovery path: lose the Cloud ID, lose the data.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Cloud ID is an opaque printable token. Restricting the charset removes any
// chance of control characters reaching the hash input.
function isValidCloudId(s: unknown): s is string {
  return typeof s === "string" && s.length >= 32 && s.length <= 256 && /^[A-Za-z0-9\-_]+$/.test(s);
}

const B64 = /^[A-Za-z0-9+/=]+$/;
const NOTE_ID = /^[A-Za-z0-9_-]{1,128}$/;

/** Decoded byte length of a base64 string, or -1 when it is not valid base64. */
function b64Len(s: string): number {
  try { return atob(s).length; } catch { return -1; }
}

function isIsoDate(s: unknown): s is string {
  return typeof s === "string" && s.length <= 40 && !Number.isNaN(Date.parse(s));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json();
    const { secretKey, notes } = body ?? {};

    if (!isValidCloudId(secretKey)) return jsonRes({ error: "Invalid Cloud ID" }, 400);
    if (!Array.isArray(notes) || notes.length === 0 || notes.length > 500) {
      return jsonRes({ error: "notes must be an array of 1..500 items" }, 400);
    }

    for (const n of notes) {
      if (!n
        || !NOTE_ID.test(String(n.id ?? ""))
        || typeof n.ciphertext !== "string" || n.ciphertext.length === 0 || n.ciphertext.length > 5_000_000 || !B64.test(n.ciphertext)
        || typeof n.nonce !== "string" || !B64.test(n.nonce) || b64Len(n.nonce) !== 12
        || b64Len(n.ciphertext) <= 0
        || !isIsoDate(n.clientUpdatedAt)) {
        return jsonRes({ error: "Invalid note payload" }, 400);
      }
    }

    const userHash = await sha256Hex(secretKey + ":auth");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = notes.map((n: any) => ({
      user_hash: userHash,
      note_id: String(n.id),
      ciphertext: n.ciphertext,
      nonce: n.nonce,
      client_updated_at: new Date(n.clientUpdatedAt).toISOString(),
    }));

    const { error } = await supabase
      .from("cloud_backups")
      .upsert(rows, { onConflict: "user_hash,note_id" });

    if (error) {
      console.error("upsert error", error);
      return jsonRes({ error: "Backup failed" }, 500);
    }

    return jsonRes({ ok: true, count: rows.length });
  } catch (e) {
    console.error(e);
    return jsonRes({ error: "Bad request" }, 400);
  }
});
