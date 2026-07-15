// Finish passkey registration: verify the client's attestation, store the credential,
// and mark this device as webauthn-verified.
import { requireAdmin, json, corsHeaders } from "../_shared/admin-auth.ts";
import { verifyRegistrationResponse, getRp } from "../_shared/webauthn.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const ctx = await requireAdmin(req, { requireWebauthn: false });
  if (ctx instanceof Response) return ctx;
  if (!ctx.admin) return json({ error: "Admin only" }, 403);

  const response = ctx.body?.response as any;
  const nickname = String(ctx.body?.nickname ?? "").slice(0, 80) || null;
  if (!response?.id || !response?.response) return json({ error: "Invalid response" }, 400);

  const { rpID, origin } = getRp(req);

  // Look up the challenge stored for this admin.
  const clientChallenge = (() => {
    try {
      const clientDataJSON = response.response.clientDataJSON as string;
      const bin = atob(clientDataJSON.replace(/-/g, "+").replace(/_/g, "/"));
      const json = JSON.parse(bin);
      return json.challenge as string;
    } catch { return ""; }
  })();
  if (!clientChallenge) return json({ error: "Missing challenge" }, 400);

  const { data: ch } = await ctx.service
    .from("admin_webauthn_challenges")
    .select("id, challenge, purpose, admin_id, expires_at, consumed_at")
    .eq("challenge", clientChallenge)
    .eq("purpose", "register")
    .eq("admin_id", ctx.admin.id)
    .maybeSingle();

  if (!ch) return json({ error: "Challenge not found" }, 400);
  if (ch.consumed_at) return json({ error: "Challenge already used" }, 400);
  if (new Date(ch.expires_at) < new Date()) return json({ error: "Challenge expired" }, 400);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  if (!verification.verified || !verification.registrationInfo) {
    return json({ error: "Verification failed" }, 400);
  }

  const info: any = verification.registrationInfo;
  const cred = info.credential ?? info; // support both older/newer shapes
  const credentialID: string = typeof cred.id === "string" ? cred.id : bufferToBase64Url(cred.credentialID ?? cred.id);
  const publicKeyBytes: Uint8Array = cred.publicKey ?? cred.credentialPublicKey;
  const counter: number = cred.counter ?? 0;
  const transports: string[] = response?.response?.transports ?? [];

  await ctx.service.from("admin_webauthn_challenges")
    .update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);

  const { error: insErr } = await ctx.service.from("admin_passkeys").insert({
    admin_id: ctx.admin.id,
    credential_id: credentialID,
    public_key: bufferToBase64Url(publicKeyBytes),
    counter,
    transports,
    device_type: info.credentialDeviceType ?? null,
    backed_up: !!info.credentialBackedUp,
    aaguid: info.aaguid ?? null,
    nickname,
  });
  if (insErr) return json({ error: insErr.message }, 400);

  // Mark device as freshly verified.
  if (ctx.device.device_id) {
    await ctx.service.from("admin_devices").update({
      webauthn_verified_at: new Date().toISOString(),
    }).eq("admin_id", ctx.admin.id);
  }

  return json({ ok: true });
});

function bufferToBase64Url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
