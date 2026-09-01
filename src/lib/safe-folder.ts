import { getSettings, saveSettings } from '@/lib/db';

/**
 * Safe Folder PIN handling.
 *
 * The PIN never leaves the device: we store only a PBKDF2-SHA256 hash with a
 * random per-device salt in the local settings record.
 */

const ITERATIONS = 150_000;

function toHex(buf: ArrayBuffer | Uint8Array): string {
  return Array.from(buf instanceof Uint8Array ? buf : new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

async function derive(pin: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return toHex(bits);
}

export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export async function hasSafePin(): Promise<boolean> {
  const s = await getSettings();
  return !!(s.safePinHash && s.safePinSalt);
}

export async function setSafePin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error('PIN must be 4-8 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(pin, salt);
  const s = await getSettings();
  await saveSettings({ ...s, safePinHash: hash, safePinSalt: toHex(salt) });
}

export async function verifySafePin(pin: string): Promise<boolean> {
  const s = await getSettings();
  if (!s.safePinHash || !s.safePinSalt) return false;
  const hash = await derive(pin, fromHex(s.safePinSalt));
  // constant-time-ish comparison
  if (hash.length !== s.safePinHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ s.safePinHash.charCodeAt(i);
  return diff === 0;
}

export async function changeSafePin(currentPin: string, newPin: string): Promise<void> {
  const ok = await verifySafePin(currentPin);
  if (!ok) throw new Error('Current PIN is incorrect.');
  await setSafePin(newPin);
}
