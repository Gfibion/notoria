// Admin fetches a user's encrypted backups + the escrow-wrapped key so they can
// decrypt locally (with the escrow private key) and re-encrypt to a new secret for the user.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  let userHash = "";
  try {
    const body = await req.json();
    userHash = String(body?.userHash ?? "").trim();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!/^[0-9a-f]{64}$/.test(userHash)) return json({ error: "Invalid user hash" }, 400);

  const { data, error } = await ctx.service
    .from("cloud_backups")
    .select("note_id, ciphertext, nonce, escrow_wrapped_key, client_updated_at, updated_at")
    .eq("user_hash", userHash);
  if (error) return json({ error: error.message }, 500);

  const rows = data ?? [];
  const wrappedKey = rows.find(r => (r as any).escrow_wrapped_key)?.escrow_wrapped_key ?? null;

  return json({
    ok: true,
    userHash,
    wrappedKey,
    notes: rows,
    recoverable: !!wrappedKey,
  });
});
