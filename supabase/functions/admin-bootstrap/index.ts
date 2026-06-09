// Returns the caller's admin status (or null) and current escrow presence.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req, { allowAnyAuthed: true });
  if (ctx instanceof Response) return ctx;

  const { data: escrow } = await ctx.service
    .from("admin_escrow")
    .select("public_key_jwk, created_at")
    .maybeSingle();

  const { count: adminCount } = await ctx.service
    .from("admins")
    .select("*", { count: "exact", head: true });

  return json({
    ok: true,
    user: { id: ctx.userId, email: ctx.email },
    admin: ctx.admin, // null if not an admin
    escrow: escrow ?? null,
    adminCount: adminCount ?? 0,
  });
});
