// Client-side WebAuthn passkey helpers for admin auth.
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";
import { getAdminDeviceId } from "@/lib/admin-client";

function devicePayload() {
  return {
    _device: {
      id: getAdminDeviceId(),
      ua: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : "",
    },
  };
}

async function call<T>(fn: string, body: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke<any>(fn, {
    body: { ...body, ...devicePayload() },
  });
  if (error) {
    const ctx = (error as any).context;
    if (ctx && typeof ctx.json === "function") {
      try {
        const parsed = await ctx.json();
        const err = new Error(parsed?.error || error.message);
        (err as any).code = parsed?.code;
        throw err;
      } catch (e) {
        if (e instanceof Error && (e as any).code !== undefined) throw e;
      }
    }
    throw new Error(error.message || `${fn} failed`);
  }
  if (data?.error) {
    const err = new Error(data.error);
    (err as any).code = data.code;
    throw err;
  }
  return data as T;
}

export function isPasskeySupported(): boolean {
  return typeof window !== "undefined"
    && typeof window.PublicKeyCredential !== "undefined"
    && typeof navigator?.credentials?.create === "function";
}

/** Register a new passkey for the currently signed-in admin. Requires an active Supabase session. */
export async function registerPasskey(nickname?: string): Promise<void> {
  const { options } = await call<{ options: any }>("admin-passkey-register-begin");
  const attestation = await startRegistration({ optionsJSON: options });
  await call("admin-passkey-register-finish", { response: attestation, nickname });
}

/**
 * Perform WebAuthn step-up for the currently signed-in admin.
 * On success, the admin's device is marked as biometrically verified for 12 hours.
 */
export async function stepUpPasskey(): Promise<void> {
  const { options } = await call<{ options: any }>("admin-passkey-auth-begin");
  const assertion = await startAuthentication({ optionsJSON: options });
  await call("admin-passkey-auth-finish", { response: assertion });
}

/**
 * Passwordless passkey sign-in.
 * Verifies a discoverable credential, then exchanges the resulting hashed token
 * for a Supabase session via verifyOtp.
 */
export async function loginWithPasskey(): Promise<void> {
  const { options } = await call<{ options: any }>("admin-passkey-auth-begin");
  const assertion = await startAuthentication({ optionsJSON: options });
  const res = await call<{ email: string; tokenHash: string }>("admin-passkey-auth-finish", { response: assertion });
  const { error } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: res.tokenHash,
  } as any);
  if (error) throw error;
}

export interface AdminPasskey {
  id: string;
  credential_id: string;
  nickname: string | null;
  device_type: string | null;
  backed_up: boolean;
  transports: string[];
  created_at: string;
  last_used_at: string | null;
}

export const passkeysApi = {
  list: () => call<{ ok: true; passkeys: AdminPasskey[] }>("admin-passkeys", { action: "list" }),
  remove: (id: string) => call<{ ok: true }>("admin-passkeys", { action: "delete", id }),
  rename: (id: string, nickname: string) => call<{ ok: true }>("admin-passkeys", { action: "rename", id, nickname }),
};
