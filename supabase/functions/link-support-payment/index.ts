import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkRateLimit } from "../_shared/rate-limit.ts";

/**
 * Links a verified Paystack payment to a Cloud ID hash so the supporter tier
 * activates automatically in the app. Used when someone pays on one device
 * and wants their support recognized on another.
 */

const ALLOWED_CURRENCIES = new Set(["NGN", "USD", "GHS", "KES", "ZAR"]);

const TIER_THRESHOLDS: Record<string, [number, number]> = {
  // minor units (kobo/cents/pesewas): [backer, champion]
  USD: [500, 1000],
  NGN: [250_000, 500_000],
  GHS: [2_500, 5_000],
  KES: [25_000, 50_000],
  ZAR: [10_000, 20_000],
};

function tierFor(minor: number, currency: string): string {
  const t = TIER_THRESHOLDS[currency.toUpperCase()];
  if (!t) return "supporter";
  if (minor >= t[1]) return "champion";
  if (minor >= t[0]) return "backer";
  return "supporter";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const rl = await checkRateLimit(service, req, "link_support_payment", 30);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: rl.message }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!token) {
      return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference ?? "");
    const userHash = String(body?.user_hash ?? "");

    if (!reference || !/^[A-Za-z0-9_-]{6,100}$/.test(reference)) {
      return new Response(JSON.stringify({ error: "Invalid reference" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^[a-f0-9]{64}$/.test(userHash)) {
      return new Response(JSON.stringify({ error: "Invalid Cloud ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify with Paystack first — never trust the client's claim of success.
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return new Response(JSON.stringify({ error: data?.message || "Verification failed" }), {
        status: res.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = data.data ?? {};
    const status = String(tx.status ?? "");
    if (status !== "success") {
      return new Response(JSON.stringify({ error: `Payment is not completed (status: ${status || "unknown"})` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txCurrency = (tx.currency ?? "").toString().toUpperCase();
    const txAmount = typeof tx.amount === "number" ? tx.amount : NaN;
    if (!ALLOWED_CURRENCIES.has(txCurrency) || !Number.isFinite(txAmount)) {
      return new Response(JSON.stringify({ error: "Payment currency/amount not supported" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tier = tierFor(txAmount, txCurrency);

    // Never steal a payment already linked to a different Cloud ID.
    const { data: existing, error: selErr } = await service
      .from("coffee_supports")
      .select("user_hash")
      .eq("checkout_id", reference)
      .maybeSingle();
    if (selErr) {
      console.error("link-support-payment select failed", selErr);
    }
    if (existing?.user_hash && existing.user_hash !== userHash) {
      return new Response(JSON.stringify({ error: "This payment is already linked to another Cloud ID" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await service.from("coffee_supports").upsert({
      checkout_id: reference,
      product_id: tx.channel ?? null,
      product_name: `Paystack · ${tx.channel ?? "payment"}`,
      amount: txAmount,
      currency: txCurrency.toLowerCase(),
      status: "succeeded",
      tier,
      user_hash: userHash,
      customer_email: null,
    }, { onConflict: "checkout_id" });
    if (upErr) {
      console.error("link-support-payment upsert failed", upErr);
      return new Response(JSON.stringify({ error: "Could not link the payment" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ tier, amount: txAmount, currency: txCurrency }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
