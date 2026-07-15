// Shared WebAuthn helpers for admin passkeys.
// Uses @simplewebauthn/server via npm: specifier (Deno).
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@11.0.0";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "npm:@simplewebauthn/server@11.0.0";

export const RP_NAME = "Novaryn Admin";

/** Derive rpID / expected origin from the incoming request. */
export function getRp(req: Request): { rpID: string; origin: string } {
  const origin = req.headers.get("origin") ?? "";
  try {
    const u = new URL(origin);
    return { rpID: u.hostname, origin };
  } catch {
    // Fallback — production URL, keeps a sane default when Origin is missing.
    return { rpID: "notoria.lovable.app", origin: "https://notoria.lovable.app" };
  }
}

export {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
};
export type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
};
