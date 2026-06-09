// List anonymous users (user_hash) with backup counts and timestamps.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const { data, error } = await ctx.service
    .from("cloud_backups")
    .select("user_hash, client_updated_at, updated_at, escrow_wrapped_key, ciphertext");

  if (error) return json({ error: error.message }, 500);

  const map = new Map<string, {
    userHash: string;
    notes: number;
    recoverable: boolean;
    lastUpdate: string;
    bytes: number;
  }>();
  for (const r of data ?? []) {
    const k = (r as any).user_hash as string;
    const prev = map.get(k);
    const t = (r as any).updated_at as string;
    const ct = (r as any).ciphertext?.length ?? 0;
    if (!prev) {
      map.set(k, {
        userHash: k,
        notes: 1,
        recoverable: !!(r as any).escrow_wrapped_key,
        lastUpdate: t,
        bytes: ct,
      });
    } else {
      prev.notes += 1;
      prev.bytes += ct;
      if (t > prev.lastUpdate) prev.lastUpdate = t;
      if ((r as any).escrow_wrapped_key) prev.recoverable = true;
    }
  }

  const users = Array.from(map.values()).sort((a, b) => (a.lastUpdate < b.lastUpdate ? 1 : -1));
  return json({ ok: true, users });
});
