// Begin passkey authentication.
// - If a valid admin bearer JWT is provided, this is a STEP-UP flow: allowCredentials
//   is scoped to that admin's registered passkeys.
// - Otherwise this is a PASSWORDLESS flow: allowCredentials is empty, relying on
//   discoverable (resident-key) credentials.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, json } from "../_shared/admin-auth.ts";
import { generateAuthenticationOptions, getRp } from "../_shared/webauthn.ts";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const authHeader = req.headers.get("Authorization");
  let adminId: string | null = null;
  let userId: string | null = null;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: userData } = await service.auth.getUser(token);
    if (userData?.user) {
      userId = userData.user.id;
      const { data: admin } = await service
        .from("admins")
        .select("id")
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (admin) adminId = admin.id;
    }
  }

  const body = await req.clone().json().catch(() => ({}));
  const deviceId = String((body?._device as any)?.id ?? "");

  const { rpID } = getRp(req);
  let allowCredentials: Array<{ id: string; transports?: string[] }> | undefined;

  if (adminId) {
    const { data: creds } = await service
      .from("admin_passkeys")
      .select("credential_id, transports")
      .eq("admin_id", adminId);
    allowCredentials = (creds ?? []).map((c: any) => ({
      id: c.credential_id,
      transports: c.transports ?? undefined,
    }));
    if (allowCredentials.length === 0) {
      return json({ error: "No passkey registered for this admin.", code: "no_passkey" }, 400);
    }
  } else {
    allowCredentials = [];
  }

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowCredentials as any,
    userVerification: "required",
    timeout: 60_000,
  });

  await service.from("admin_webauthn_challenges").insert({
    challenge: options.challenge,
    purpose: "authenticate",
    admin_id: adminId,
    user_id: userId,
    device_id: deviceId || null,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });

  return json({ ok: true, options, mode: adminId ? "step_up" : "passwordless" });
});
