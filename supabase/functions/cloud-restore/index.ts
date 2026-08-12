// Cloud restore endpoint — returns the encrypted notes stored under a Cloud ID,
// newest first (chronological order by the client's last-updated timestamp).
// Only the holder of the Cloud ID can address this data, and only they can decrypt it.
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

function isValidCloudId(s: unknown): s is string {
  return typeof s === "string" && s.length >= 32 && s.length <= 256 && /^[A-Za-z0-9\-_]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  try {
    const { secretKey, metadataOnly } = await req.json();
    if (!isValidCloudId(secretKey)) return jsonRes({ error: "Invalid Cloud ID" }, 400);

    const userHash = await sha256Hex(secretKey + ":auth");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const select = metadataOnly === true
      ? "note_id, client_updated_at, updated_at"
      : "note_id, ciphertext, nonce, client_updated_at, updated_at";

    const { data, error } = await supabase
      .from("cloud_backups")
      .select(select)
      .eq("user_hash", userHash)
      .order("client_updated_at", { ascending: false });

    if (error) {
      console.error("select error", error);
      return jsonRes({ error: "Restore failed" }, 500);
    }

    return jsonRes({ ok: true, notes: data ?? [] });
  } catch (e) {
    console.error(e);
    return jsonRes({ error: "Bad request" }, 400);
  }
});
