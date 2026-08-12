// Cloud delete endpoint — removes backups (some or all) stored under a Cloud ID.
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

const NOTE_ID = /^[A-Za-z0-9_-]{1,128}$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  try {
    const { secretKey, noteIds, all } = await req.json();
    if (!isValidCloudId(secretKey)) return jsonRes({ error: "Invalid Cloud ID" }, 400);

    const userHash = await sha256Hex(secretKey + ":auth");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let query = supabase.from("cloud_backups").delete().eq("user_hash", userHash);

    if (all !== true) {
      if (!Array.isArray(noteIds) || noteIds.length === 0 || noteIds.length > 500
          || !noteIds.every((id) => typeof id === "string" && NOTE_ID.test(id))) {
        return jsonRes({ error: "Valid noteIds required unless all=true" }, 400);
      }
      query = query.in("note_id", noteIds);
    }

    const { error } = await query;
    if (error) {
      console.error("delete error", error);
      return jsonRes({ error: "Delete failed" }, 500);
    }

    return jsonRes({ ok: true });
  } catch (e) {
    console.error(e);
    return jsonRes({ error: "Bad request" }, 400);
  }
});
