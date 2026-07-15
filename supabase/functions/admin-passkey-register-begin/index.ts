// Begin passkey registration for the currently signed-in admin.
// Returns WebAuthn PublicKeyCredentialCreationOptions (JSON) and stores the challenge server-side.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";
import { generateRegistrationOptions, getRp, RP_NAME } from "../_shared/webauthn.ts";

const CHALLENGE_TTL_MS = 5 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  // Registration itself doesn't need a prior webauthn verification (chicken-and-egg for the first key).
  const ctx = await requireAdmin(req, { requireWebauthn: false });
  if (ctx instanceof Response) return ctx;
  if (!ctx.admin) return json({ error: "Admin only" }, 403);

  const { rpID } = getRp(req);

  const { data: existing } = await ctx.service
    .from("admin_passkeys")
    .select("credential_id, transports")
    .eq("admin_id", ctx.admin.id);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(ctx.admin.id),
    userName: ctx.admin.email,
    userDisplayName: ctx.admin.email,
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c: any) => ({
      id: c.credential_id,
      transports: c.transports ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
    },
    timeout: 60_000,
  });

  await ctx.service.from("admin_webauthn_challenges").insert({
    challenge: options.challenge,
    purpose: "register",
    admin_id: ctx.admin.id,
    user_id: ctx.userId,
    device_id: ctx.device.device_id || null,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  });

  return json({ ok: true, options });
});
