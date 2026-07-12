import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

const ALLOWED_CURRENCIES = ["NGN", "USD", "GHS", "KES", "ZAR"] as const;
const ALLOWED_CHANNELS = ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!token) {
      return new Response(JSON.stringify({ error: "PAYSTACK_SECRET_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const amount = Number(body?.amount); // in major units (e.g. 5 = 5 NGN)
    const currency = typeof body?.currency === "string" ? body.currency.toUpperCase() : "NGN";
    const callbackUrl = typeof body?.callback_url === "string" ? body.callback_url : "";
    const rawChannels: unknown = body?.channels;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_000_000) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_CURRENCIES.includes(currency as any)) {
      return new Response(JSON.stringify({ error: "Unsupported currency" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!/^https?:\/\//.test(callbackUrl)) {
      return new Response(JSON.stringify({ error: "Invalid callback_url" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let channels: string[] | undefined;
    if (Array.isArray(rawChannels)) {
      channels = rawChannels.filter((c: unknown): c is string =>
        typeof c === "string" && (ALLOWED_CHANNELS as readonly string[]).includes(c)
      );
      if (channels.length === 0) channels = undefined;
    }

    // Paystack expects amount in minor units (kobo/cents/pesewas)
    const minorAmount = Math.round(amount * 100);

    const payload: Record<string, unknown> = {
      email,
      amount: minorAmount,
      currency,
      callback_url: callbackUrl,
      metadata: {
        source: "notoria_coffee",
        custom_fields: [
          { display_name: "Purpose", variable_name: "purpose", value: "Support Novaryn" },
        ],
      },
    };
    if (channels) payload.channels = channels;

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data?.status) {
      return new Response(JSON.stringify({ error: data?.message || "Payment initialization failed" }), {
        status: res.status || 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        url: data.data.authorization_url,
        reference: data.data.reference,
        access_code: data.data.access_code,
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
