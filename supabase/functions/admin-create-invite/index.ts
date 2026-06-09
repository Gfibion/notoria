// Master admin creates a one-time invite for the second admin.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

function randomToken(): string {
  const b = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(b).map(x => x.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req, { requireMaster: true });
  if (ctx instanceof Response) return ctx;

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
  } catch {
    return json({ error: "Bad request" }, 400);
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "Invalid email" }, 400);

  // Enforce hard cap of 2 admins
  const { count: adminCount } = await ctx.service.from("admins").select("*", { count: "exact", head: true });
  if ((adminCount ?? 0) >= 2) return json({ error: "Admin limit reached (2)" }, 400);

  // Clear any previous open invite for this email
  await ctx.service.from("admin_invites").delete().eq("email", email).is("used_at", null);

  const token = randomToken();
  const { error } = await ctx.service.from("admin_invites").insert({
    token,
    email,
    created_by: ctx.userId,
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, token, email });
});
