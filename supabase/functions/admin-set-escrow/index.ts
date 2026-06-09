// Master admin publishes the escrow PUBLIC key. Private key never touches the server.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req, { requireMaster: true });
  if (ctx instanceof Response) return ctx;

  let publicKeyJwk: unknown;
  try {
    const body = await req.json();
    publicKeyJwk = body?.publicKeyJwk;
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!publicKeyJwk || typeof publicKeyJwk !== "object") {
    return json({ error: "publicKeyJwk required" }, 400);
  }
  const jwk = publicKeyJwk as Record<string, unknown>;
  if (jwk.kty !== "RSA" || typeof jwk.n !== "string" || typeof jwk.e !== "string") {
    return json({ error: "Invalid RSA public key" }, 400);
  }

  const { error } = await ctx.service
    .from("admin_escrow")
    .upsert({ id: 1, public_key_jwk: publicKeyJwk, created_by: ctx.userId }, { onConflict: "id" });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
