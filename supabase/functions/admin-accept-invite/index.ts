// Signed-in user redeems an invite token; promotes them to "invited" admin.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req, { allowAnyAuthed: true });
  if (ctx instanceof Response) return ctx;
  if (ctx.admin) return json({ error: "Already an admin" }, 400);

  let token = "";
  try {
    const body = await req.json();
    token = String(body?.token ?? "").trim();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!token) return json({ error: "Invite token required" }, 400);

  const { data: invite } = await ctx.service
    .from("admin_invites")
    .select("token, email, used_at, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return json({ error: "Invalid invite" }, 400);
  if (invite.used_at) return json({ error: "Invite already used" }, 400);
  if (new Date(invite.expires_at) < new Date()) return json({ error: "Invite expired" }, 400);
  if (invite.email.toLowerCase() !== (ctx.email ?? "").toLowerCase()) {
    return json({ error: "Sign in with the invited email" }, 403);
  }

  const { count } = await ctx.service.from("admins").select("*", { count: "exact", head: true });
  if ((count ?? 0) >= 2) return json({ error: "Admin limit reached" }, 400);

  const { error: insErr } = await ctx.service
    .from("admins")
    .insert({ user_id: ctx.userId, email: ctx.email, role: "invited" });
  if (insErr) return json({ error: insErr.message }, 500);

  await ctx.service
    .from("admin_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("token", token);

  return json({ ok: true });
});
