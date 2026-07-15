// Finish passkey authentication.
// - Step-up (bearer JWT present): mark the device webauthn_verified_at = now.
// - Passwordless: generate a magiclink for the resolved admin's email and return
//   the hashed token so the client can call supabase.auth.verifyOtp() and get a
//   session. Also inserts a pending admin_webauthn_verifications row that the
//   next admin-bootstrap call consumes to set webauthn_verified_at.
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { corsHeaders, json } from "../_shared/admin-auth.ts";
import { verifyAuthenticationResponse, getRp } from "../_shared/webauthn.ts";

const VERIFICATION_TTL_MS = 5 * 60 * 1000;

function base64UrlToBytes(s: string): Uint8Array {
  const pad = 4 - (s.length % 4 || 4);
  const b64 = (s + "=".repeat(pad === 4 ? 0 : pad)).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64Url(buf: Uint8Array | ArrayBuffer): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function extractIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.clone().json().catch(() => ({} as any));
  const response = body?.response as any;
  if (!response?.id || !response?.response) return json({ error: "Invalid response" }, 400);

  const device = {
    id: String((body?._device as any)?.id ?? "").trim(),
    ua: String((body?._device as any)?.ua ?? req.headers.get("user-agent") ?? "").slice(0, 300),
  };
  const ip = extractIp(req);

  // Extract challenge from clientDataJSON.
  let clientChallenge = "";
  try {
    const clientDataJSON = response.response.clientDataJSON as string;
    const bin = atob(clientDataJSON.replace(/-/g, "+").replace(/_/g, "/"));
    clientChallenge = JSON.parse(bin).challenge;
  } catch {
    return json({ error: "Bad clientDataJSON" }, 400);
  }
  if (!clientChallenge) return json({ error: "Missing challenge" }, 400);

  const { data: ch } = await service
    .from("admin_webauthn_challenges")
    .select("id, challenge, purpose, admin_id, expires_at, consumed_at")
    .eq("challenge", clientChallenge)
    .eq("purpose", "authenticate")
    .maybeSingle();

  if (!ch) return json({ error: "Challenge not found" }, 400);
  if (ch.consumed_at) return json({ error: "Challenge already used" }, 400);
  if (new Date(ch.expires_at) < new Date()) return json({ error: "Challenge expired" }, 400);

  // Look up the credential the assertion refers to.
  const credentialId: string = response.id;
  const { data: cred } = await service
    .from("admin_passkeys")
    .select("id, admin_id, public_key, counter, transports")
    .eq("credential_id", credentialId)
    .maybeSingle();
  if (!cred) return json({ error: "Unknown credential" }, 400);

  // If a challenge was scoped to a specific admin (step-up), enforce it matches.
  if (ch.admin_id && ch.admin_id !== cred.admin_id) {
    return json({ error: "Credential/admin mismatch" }, 400);
  }

  const { rpID, origin } = getRp(req);
  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credentialId,
        publicKey: base64UrlToBytes(cred.public_key),
        counter: Number(cred.counter ?? 0),
        transports: cred.transports ?? undefined,
      },
    } as any);
  } catch (e) {
    return json({ error: (e as Error).message }, 400);
  }
  if (!verification.verified) return json({ error: "Verification failed" }, 400);

  const newCounter = (verification as any).authenticationInfo?.newCounter ?? 0;
  await service.from("admin_passkeys").update({
    counter: newCounter,
    last_used_at: new Date().toISOString(),
  }).eq("id", cred.id);

  await service.from("admin_webauthn_challenges")
    .update({ consumed_at: new Date().toISOString() }).eq("id", ch.id);

  const { data: admin } = await service
    .from("admins")
    .select("id, user_id, email")
    .eq("id", cred.admin_id)
    .maybeSingle();
  if (!admin) return json({ error: "Admin not found" }, 400);

  // Step-up: the caller is already signed in as this admin.
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const { data: userData } = await service.auth.getUser(token);
    if (userData?.user?.id === admin.user_id) {
      if (!device.id) return json({ error: "Missing device id" }, 400);
      // Only mark verified if the device is (or becomes) this admin's bound device.
      const { data: bound } = await service
        .from("admin_devices")
        .select("device_id")
        .eq("admin_id", admin.id)
        .maybeSingle();
      if (bound && bound.device_id !== device.id) {
        return json({
          error: "This device is not authorized. Transfer the device binding first.",
          code: "device_not_authorized",
        }, 403);
      }
      if (!bound) {
        await service.from("admin_devices").insert({
          admin_id: admin.id, device_id: device.id, ip, user_agent: device.ua,
          webauthn_verified_at: new Date().toISOString(),
        });
      } else {
        await service.from("admin_devices").update({
          webauthn_verified_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          ip, user_agent: device.ua,
        }).eq("admin_id", admin.id);
      }
      return json({ ok: true, mode: "step_up" });
    }
  }

  // Passwordless flow — mint a magiclink for the admin's email; client uses verifyOtp.
  if (!device.id) return json({ error: "Missing device id" }, 400);

  // Record the successful passkey verification so the follow-up bootstrap can
  // set webauthn_verified_at once the Supabase session is established on this device.
  await service.from("admin_webauthn_verifications").insert({
    admin_id: admin.id,
    device_id: device.id,
    ip,
    user_agent: device.ua,
    expires_at: new Date(Date.now() + VERIFICATION_TTL_MS).toISOString(),
  });

  const { data: link, error: linkErr } = await (service.auth.admin as any).generateLink({
    type: "magiclink",
    email: admin.email,
    options: {
      redirectTo: (req.headers.get("origin") ?? "") + "/admin",
    },
  });
  if (linkErr || !link) return json({ error: linkErr?.message ?? "Could not mint session" }, 500);

  const hashed = (link as any).properties?.hashed_token ?? (link as any).hashed_token;
  if (!hashed) return json({ error: "No hashed token returned" }, 500);

  return json({
    ok: true,
    mode: "passwordless",
    email: admin.email,
    tokenHash: hashed,
  });
});
