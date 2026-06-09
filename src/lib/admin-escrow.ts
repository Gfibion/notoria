// Escrow keypair: RSA-OAEP 2048. The PUBLIC key goes to the server,
// the PRIVATE key never leaves the master admin's device.
// We also let the admin store a PIN-encrypted copy of the private key in IndexedDB.

const enc = new TextEncoder();
const dec = new TextDecoder();

function toB64(u: ArrayBuffer | Uint8Array): string {
  const b = u instanceof Uint8Array ? u : new Uint8Array(u);
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}
function fromB64(s: string): Uint8Array {
  const bin = atob(s); const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}

export async function generateEscrowKeypair() {
  const kp = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt", "wrapKey", "unwrapKey"],
  );
  const publicJwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", kp.privateKey);
  return { publicJwk, privateJwk };
}

export async function importEscrowPublic(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
}

export async function importEscrowPrivate(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey("jwk", jwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["decrypt"]);
}

/** Wrap the user's AES key bytes (32 bytes) with the escrow public key. Returns base64. */
export async function wrapUserKey(escrowPub: CryptoKey, userKeyBytes: Uint8Array): Promise<string> {
  const ct = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, escrowPub, userKeyBytes as BufferSource);
  return toB64(ct);
}

/** Unwrap with private key. Returns the AES key bytes. */
export async function unwrapUserKey(escrowPriv: CryptoKey, wrappedB64: string): Promise<Uint8Array> {
  const pt = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, escrowPriv, fromB64(wrappedB64) as BufferSource);
  return new Uint8Array(pt);
}

/** Derive the raw 32-byte AES key bytes from the user secret (mirrors cloud-crypto). */
export async function deriveUserKeyBytes(secret: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(secret + ":enc"));
  return new Uint8Array(buf);
}

/** Decrypt a single backup row given the user's enc key bytes. */
export async function decryptWithUserKey(userKeyBytes: Uint8Array, ciphertextB64: string, nonceB64: string) {
  const key = await crypto.subtle.importKey("raw", userKeyBytes as BufferSource, { name: "AES-GCM" }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(nonceB64) as BufferSource }, key, fromB64(ciphertextB64) as BufferSource);
  return JSON.parse(dec.decode(pt));
}

// ── PIN-encrypted local storage for the escrow private key ───────────────
const DB_NAME = "notoria-admin";
const STORE = "escrow";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key: string, val: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

interface WrappedEscrow {
  salt: string; nonce: string; ciphertext: string; iterations: number;
}

async function pinKey(pin: string, salt: Uint8Array, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"],
  );
}

export async function storeEscrowPrivatePinned(privateJwk: JsonWebKey, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const iter = 250_000;
  const k = await pinKey(pin, salt, iter);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce as BufferSource }, k, enc.encode(JSON.stringify(privateJwk)));
  const wrapped: WrappedEscrow = { salt: toB64(salt), nonce: toB64(nonce), ciphertext: toB64(ct), iterations: iter };
  await idbSet("private", wrapped);
}

export async function hasStoredEscrowPrivate(): Promise<boolean> {
  return !!(await idbGet<WrappedEscrow>("private"));
}

export async function loadEscrowPrivatePinned(pin: string): Promise<JsonWebKey> {
  const wrapped = await idbGet<WrappedEscrow>("private");
  if (!wrapped) throw new Error("No local escrow key stored");
  const k = await pinKey(pin, fromB64(wrapped.salt), wrapped.iterations);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(wrapped.nonce) as BufferSource }, k, fromB64(wrapped.ciphertext) as BufferSource);
  return JSON.parse(dec.decode(pt));
}

export async function clearStoredEscrowPrivate(): Promise<void> {
  await idbDel("private");
}

export function downloadEscrowPrivate(privateJwk: JsonWebKey) {
  const blob = new Blob([JSON.stringify({ kind: "notoria-escrow-private-v1", privateJwk }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `notoria-escrow-private-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export { toB64 as escrowToB64, fromB64 as escrowFromB64 };
