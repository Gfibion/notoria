import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const { count: totalBackups } = await ctx.service
    .from("cloud_backups")
    .select("*", { count: "exact", head: true });

  const { count: recoverableBackups } = await ctx.service
    .from("cloud_backups")
    .select("*", { count: "exact", head: true })
    .not("escrow_wrapped_key", "is", null);

  // unique user hashes + storage size (approx)
  const { data: rows } = await ctx.service
    .from("cloud_backups")
    .select("user_hash, ciphertext");
  const users = new Set<string>();
  let bytes = 0;
  for (const r of rows ?? []) {
    users.add((r as any).user_hash);
    bytes += ((r as any).ciphertext?.length ?? 0);
  }

  const { count: adminCount } = await ctx.service
    .from("admins")
    .select("*", { count: "exact", head: true });

  const { count: pendingInvites } = await ctx.service
    .from("admin_invites")
    .select("*", { count: "exact", head: true })
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString());

  return json({
    ok: true,
    stats: {
      totalBackups: totalBackups ?? 0,
      recoverableBackups: recoverableBackups ?? 0,
      uniqueUsers: users.size,
      approxBytes: bytes,
      adminCount: adminCount ?? 0,
      pendingInvites: pendingInvites ?? 0,
    },
  });
});
