import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("POLAR_ACCESS_TOKEN");
    if (!token) {
      return new Response(JSON.stringify({ error: "POLAR_ACCESS_TOKEN not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const checkoutId = url.searchParams.get("checkout_id");
    if (!checkoutId || !/^[a-zA-Z0-9_-]{8,}$/.test(checkoutId)) {
      return new Response(JSON.stringify({ error: "Invalid checkout_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(`https://api.polar.sh/v1/checkouts/${checkoutId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: data?.error || "Verification failed" }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record successful supports for admin analytics (idempotent on checkout_id)
    if (data?.status === "succeeded") {
      try {
        const service = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        await service.from("coffee_supports").upsert({
          checkout_id: checkoutId,
          product_id: data.product?.id ?? data.product_id ?? null,
          product_name: data.product?.name ?? null,
          amount: typeof data.amount === "number" ? data.amount : null,
          currency: data.currency ?? null,
          status: data.status,
          customer_email: data.customer_email ?? data.customer?.email ?? null,
        }, { onConflict: "checkout_id" });
      } catch (e) {
        console.error("coffee_supports insert failed", e);
      }
    }

    return new Response(
      JSON.stringify({
        status: data.status,
        product_name: data.product?.name,
        amount: data.amount,
        currency: data.currency,
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
