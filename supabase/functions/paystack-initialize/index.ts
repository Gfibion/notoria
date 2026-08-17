import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { checkRateLimit } from "../_shared/rate-limit.ts";

const ALLOWED_CURRENCIES = ["NGN", "USD", "GHS", "KES", "ZAR"] as const;
const ALLOWED_CHANNELS = ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"] as const;

/** Callbacks may only point back at our own app origins. */
const ALLOWED_CALLBACK_ORIGINS = [
  "https://notoria.lovable.app",
  "https://notoria1.netlify.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

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
  const rl = await checkRateLimit(service, req, "paystack_initialize", 20);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: rl.message }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
    const callbackOk = (() => {
      try {
        const u = new URL(callbackUrl);
        return ALLOWED_CALLBACK_ORIGINS.includes(u.origin);
      } catch { return false; }
    })();
    if (!callbackOk) {
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
