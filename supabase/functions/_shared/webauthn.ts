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

/**
 * Allowlisted origins for WebAuthn. The Origin header is attacker-controllable,
 * so it is only trusted when it exactly matches this list — otherwise we fail
 * closed to the canonical production origin.
 */
const ALLOWED_ORIGINS = [
  "https://notoria.lovable.app",
  "https://notoria1.netlify.app",
  "https://id-preview--f825c0ba-a3ad-43d6-8710-02575d74ac61.lovable.app",
  "http://localhost:8080",
  "http://localhost:5173",
];

const DEFAULT_ORIGIN = "https://notoria.lovable.app";

/** Derive rpID / expected origin from the incoming request (allowlisted only). */
export function getRp(req: Request): { rpID: string; origin: string } {
  const origin = (req.headers.get("origin") ?? "").trim();
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    return { rpID: new URL(origin).hostname, origin };
  }
  // Never fall back to attacker-supplied input.
  return { rpID: new URL(DEFAULT_ORIGIN).hostname, origin: DEFAULT_ORIGIN };
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
