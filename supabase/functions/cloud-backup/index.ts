// Cloud backup endpoint - stores end-to-end-encrypted notes.
// Auth: caller provides a secret key; server only stores SHA-256(secret + ":auth") as user_hash.
// Server never sees plaintext note content.
// Optional: caller may supply `escrowWrappedKey` (base64 RSA-OAEP wrap of the user's enc key)
// so that an admin can later assist with recovery if the user loses their secret.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function isValidSecret(s: unknown): s is string {
  return typeof s === "string" && s.length >= 32 && s.length <= 256;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { secretKey, notes, escrowWrappedKey } = body ?? {};

    if (!isValidSecret(secretKey)) {
      return new Response(JSON.stringify({ error: "Invalid secret key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Array.isArray(notes) || notes.length === 0 || notes.length > 500) {
      return new Response(JSON.stringify({ error: "notes must be an array of 1..500 items" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const wrappedKey = (typeof escrowWrappedKey === "string" && escrowWrappedKey.length < 4096)
      ? escrowWrappedKey
      : null;

    for (const n of notes) {
      if (!n || typeof n.id !== "string" || typeof n.ciphertext !== "string"
          || typeof n.nonce !== "string" || typeof n.clientUpdatedAt !== "string"
          || n.id.length > 128 || n.ciphertext.length > 5_000_000 || n.nonce.length > 128) {
        return new Response(JSON.stringify({ error: "Invalid note payload" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const userHash = await sha256Hex(secretKey + ":auth");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rows = notes.map((n: any) => ({
      user_hash: userHash,
      note_id: n.id,
      ciphertext: n.ciphertext,
      nonce: n.nonce,
      client_updated_at: n.clientUpdatedAt,
      escrow_wrapped_key: wrappedKey,
    }));

    const { error } = await supabase
      .from("cloud_backups")
      .upsert(rows, { onConflict: "user_hash,note_id" });

    if (error) {
      console.error("upsert error", error);
      return new Response(JSON.stringify({ error: "Backup failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, count: rows.length, escrowAttached: !!wrappedKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
