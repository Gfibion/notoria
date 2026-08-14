import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

/** Store only a non-identifying, masked form of the payer email. */
function maskEmail(email: unknown): string | null {
  if (typeof email !== "string" || !email.includes("@")) return null;
  const [local, domain] = email.trim().toLowerCase().split("@");
  if (!local || !domain) return null;
  const head = local.slice(0, 1);
  return `${head}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`.slice(0, 255);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const token = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!token) {
      return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const reference = String(body?.reference ?? "");
    if (!reference || !/^[A-Za-z0-9_-]{6,100}$/.test(reference)) {
      return new Response(JSON.stringify({ error: "Invalid reference" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return new Response(JSON.stringify({ error: data?.message || "Verification failed" }), {
        status: res.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tx = data.data ?? {};
    const paystackStatus = String(tx.status ?? "");
    // Normalize to our schema ("succeeded" | others). Paystack uses "success".
    const normalizedStatus = paystackStatus === "success" ? "succeeded" : paystackStatus;

    if (normalizedStatus === "succeeded") {
      try {
        const service = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await service.from("coffee_supports").upsert({
          checkout_id: reference,
          product_id: tx.channel ?? null,
          product_name: `Paystack · ${tx.channel ?? "payment"}`,
          amount: typeof tx.amount === "number" ? tx.amount : null,
          currency: (tx.currency ?? "").toString().toLowerCase() || null,
          status: normalizedStatus,
          customer_email: maskEmail(tx.customer?.email),
        }, { onConflict: "checkout_id" });
      } catch (e) {
        console.error("coffee_supports upsert failed", e);
      }
    }

    return new Response(
      JSON.stringify({
        status: normalizedStatus,
        raw_status: paystackStatus,
        amount: tx.amount,
        currency: tx.currency,
        channel: tx.channel,
        reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
