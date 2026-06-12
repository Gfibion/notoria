import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req);
  if (ctx instanceof Response) return ctx;

  const { data: rows, error } = await ctx.service
    .from("coffee_supports")
    .select("id, checkout_id, product_name, amount, currency, status, customer_email, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return json({ error: error.message }, 500);

  const all = rows ?? [];
  const succeeded = all.filter(r => r.status === "succeeded");

  // Aggregate totals per currency (Polar amounts are in minor units / cents)
  const byCurrency: Record<string, { count: number; amount: number }> = {};
  for (const r of succeeded) {
    const cur = (r.currency ?? "unknown").toLowerCase();
    if (!byCurrency[cur]) byCurrency[cur] = { count: 0, amount: 0 };
    byCurrency[cur].count += 1;
    byCurrency[cur].amount += typeof r.amount === "number" ? r.amount : 0;
  }

  // Last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const last30 = succeeded.filter(r => new Date(r.created_at).getTime() >= thirtyDaysAgo);

  // Unique supporters (by email when available)
  const supporters = new Set<string>();
  for (const r of succeeded) {
    if (r.customer_email) supporters.add(r.customer_email.toLowerCase());
  }

  return json({
    ok: true,
    stats: {
      totalSupports: succeeded.length,
      uniqueSupporters: supporters.size,
      last30DaysCount: last30.length,
      byCurrency,
    },
    recent: all.slice(0, 50),
  });
});
