// Cloud restore endpoint - returns all encrypted notes for a given secret key.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { secretKey, metadataOnly } = await req.json();
    if (typeof secretKey !== "string" || secretKey.length < 32 || secretKey.length > 256) {
      return new Response(JSON.stringify({ error: "Invalid secret key" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userHash = await sha256Hex(secretKey + ":auth");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const select = metadataOnly
      ? "note_id, client_updated_at, updated_at"
      : "note_id, ciphertext, nonce, client_updated_at, updated_at";

    const { data, error } = await supabase
      .from("cloud_backups")
      .select(select)
      .eq("user_hash", userHash)
      .order("client_updated_at", { ascending: false });

    if (error) {
      console.error("select error", error);
      return new Response(JSON.stringify({ error: "Restore failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, notes: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
