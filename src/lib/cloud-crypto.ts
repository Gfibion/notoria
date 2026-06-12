// End-to-end encryption helpers for cloud backups.
// The secret key never leaves the device. The server only sees:
//   - userHash  = SHA-256(secret + ":auth")  → opaque identifier
//   - ciphertext (AES-GCM, key derived from SHA-256(secret + ":enc"))
// Lose the secret = data is unrecoverable. By design.

const enc = new TextEncoder();
const dec = new TextDecoder();

// Crockford base32 alphabet — exactly 32 characters (no I, L, O, U).
// MUST be 32 chars; otherwise (value >> bits) & 31 can index past the end
// and yield `undefined`, which would be concatenated as the literal string
// "undefined" into generated keys. Do not shorten.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function bytesToBase32(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += ALPHABET[(value >> bits) & 31];
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(u).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toB64(buf: ArrayBuffer | Uint8Array): string {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of u) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const buf = new ArrayBuffer(bin.length);
  const u = new Uint8Array(buf);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u as Uint8Array<ArrayBuffer>;
}

/** Generate a fresh user secret key. ~160 bits of entropy, human-readable, grouped. */
export function generateSecretKey(): string {
  const rnd = crypto.getRandomValues(new Uint8Array(20)); // 160 bits
  const b32 = bytesToBase32(rnd); // 32 chars
  // Format: NT-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX
  const groups = b32.match(/.{1,4}/g)!.join("-");
  return `NT-${groups}`;
}

/** Strip formatting and validate basic shape. Returns canonical form or null.
 *  Tolerant of pasted whitespace (incl. NBSP / zero-width), any dash variant
 *  (-, –, —, ‑), underscores, lowercase, and stray punctuation — we keep only
 *  letters/digits and then validate the canonical alphabet. */
export function normalizeSecretKey(input: string): string | null {
  if (!input) return null;
  // Keep only ASCII letters and digits; uppercase. This automatically removes
  // NBSP, zero-width chars, en/em dashes, smart quotes, spaces, underscores, etc.
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return null;
  // Accept with or without an NT prefix.
  const core = raw.startsWith("NT") ? raw.slice(2) : raw;
  if (!/^[A-Z0-9]{32}$/.test(core)) return null;
  // The generator's alphabet excludes I, L, O, U, 0, 1 — but we accept those
  // characters too in case the user wrote a confusable by hand. We do NOT map
  // them, because the server hashes the exact string.
  return `NT-${core.match(/.{1,4}/g)!.join("-")}`;
}

async function sha256(data: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", enc.encode(data));
}

/** Derive the AES-GCM encryption key from the secret. */
async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const raw = await sha256(secret + ":enc");
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/** Derive opaque server-side user identifier. */
export async function deriveUserHash(secret: string): Promise<string> {
  return toHex(await sha256(secret + ":auth"));
}

/** Encrypt a JSON-serializable payload. Returns base64 ciphertext + base64 nonce. */
export async function encryptPayload(secret: string, payload: unknown): Promise<{ ciphertext: string; nonce: string }> {
  const key = await deriveAesKey(secret);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = enc.encode(JSON.stringify(payload));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, plaintext);
  return { ciphertext: toB64(ct), nonce: toB64(nonce) };
}

/** Decrypt a payload encrypted by encryptPayload. Throws on tamper/wrong-key. */
export async function decryptPayload<T = unknown>(secret: string, ciphertext: string, nonce: string): Promise<T> {
  const key = await deriveAesKey(secret);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(nonce) as BufferSource },
    key,
    fromB64(ciphertext),
  );
  return JSON.parse(dec.decode(pt)) as T;
}

// ─── PIN-based local keystore (AES-GCM + PBKDF2) ───────────────────────────────

export interface WrappedSecret {
  version: 1;
  method: "pin" | "webauthn";
  salt: string;       // base64
  nonce: string;      // base64
  ciphertext: string; // base64
  iterations?: number;
  credentialId?: string; // for webauthn
}

async function deriveKeyFromPin(pin: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function wrapSecretWithPin(secret: string, pin: string): Promise<WrappedSecret> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 250_000;
  const key = await deriveKeyFromPin(pin, salt, iterations);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, enc.encode(secret));
  return {
    version: 1, method: "pin", iterations,
    salt: toB64(salt), nonce: toB64(nonce), ciphertext: toB64(ct),
  };
}

export async function unwrapSecretWithPin(wrapped: WrappedSecret, pin: string): Promise<string> {
  if (wrapped.method !== "pin") throw new Error("Not a PIN-wrapped secret");
  const key = await deriveKeyFromPin(pin, fromB64(wrapped.salt), wrapped.iterations ?? 250_000);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(wrapped.nonce) as BufferSource }, key, fromB64(wrapped.ciphertext),
  );
  return dec.decode(pt);
}

// ─── WebAuthn (biometric) keystore using PRF extension ─────────────────────────
// Falls back to PIN when PRF isn't supported by the platform.

export function isWebAuthnSupported(): boolean {
  return typeof window !== "undefined"
    && !!window.PublicKeyCredential
    && !!navigator.credentials;
}

const PRF_SALT = new Uint8Array([
  0x4e, 0x6f, 0x74, 0x6f, 0x72, 0x69, 0x61, 0x2d,
  0x43, 0x6c, 0x6f, 0x75, 0x64, 0x42, 0x6b, 0x70, // "Notoria-CloudBkp"
  0x76, 0x31, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

async function deriveAesFromPrf(prfBytes: ArrayBuffer): Promise<CryptoKey> {
  // Hash PRF output to 256 bits then import as AES-GCM
  const digest = await crypto.subtle.digest("SHA-256", prfBytes);
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

/**
 * Register a new biometric credential and wrap the secret with the PRF-derived key.
 * Throws if WebAuthn or PRF aren't supported by the device/browser.
 */
export async function wrapSecretWithBiometric(secret: string): Promise<WrappedSecret> {
  if (!isWebAuthnSupported()) throw new Error("Biometrics not supported on this device");

  const userId = crypto.getRandomValues(new Uint8Array(16));
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  const cred = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Notoria" },
      user: { id: userId, name: "notoria-user", displayName: "Notoria" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },   // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      extensions: { prf: { eval: { first: PRF_SALT } } } as any,
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null;

  if (!cred) throw new Error("Biometric setup cancelled");

  const ext: any = cred.getClientExtensionResults();
  let prfBytes: ArrayBuffer | undefined = ext?.prf?.results?.first;

  // Some authenticators only return PRF on a subsequent get(); ask now.
  if (!prfBytes) {
    const credentialId = new Uint8Array(cred.rawId);
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ id: credentialId, type: "public-key" }],
        userVerification: "required",
        extensions: { prf: { eval: { first: PRF_SALT } } } as any,
        timeout: 60_000,
      },
    }) as PublicKeyCredential | null;
    prfBytes = (assertion?.getClientExtensionResults() as any)?.prf?.results?.first;
  }

  if (!prfBytes) throw new Error("Your device does not support biometric key derivation (PRF). Please use a PIN instead.");

  const key = await deriveAesFromPrf(prfBytes);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, key, enc.encode(secret));

  return {
    version: 1,
    method: "webauthn",
    salt: toB64(PRF_SALT),
    nonce: toB64(nonce),
    ciphertext: toB64(ct),
    credentialId: toB64(new Uint8Array(cred.rawId)),
  };
}

/** Unlock the secret by prompting biometric and re-deriving the PRF key. */
export async function unwrapSecretWithBiometric(wrapped: WrappedSecret): Promise<string> {
  if (wrapped.method !== "webauthn" || !wrapped.credentialId) throw new Error("Not a biometric-wrapped secret");
  if (!isWebAuthnSupported()) throw new Error("Biometrics not supported on this device");

  const credentialId = fromB64(wrapped.credentialId);
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ id: credentialId, type: "public-key" }],
      userVerification: "required",
      extensions: { prf: { eval: { first: PRF_SALT } } } as any,
      timeout: 60_000,
    },
  }) as PublicKeyCredential | null;

  const prfBytes: ArrayBuffer | undefined = (assertion?.getClientExtensionResults() as any)?.prf?.results?.first;
  if (!prfBytes) throw new Error("Biometric unlock failed");

  const key = await deriveAesFromPrf(prfBytes);
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(wrapped.nonce) as BufferSource }, key, fromB64(wrapped.ciphertext),
  );
  return dec.decode(pt);
}
