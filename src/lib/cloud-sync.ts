// Cloud sync API client. Calls Lovable Cloud edge functions, never the table directly.
import { supabase } from "@/integrations/supabase/client";
import { encryptPayload, decryptPayload } from "./cloud-crypto";
import type { Note } from "./db";

export interface CloudNoteMeta {
  note_id: string;
  client_updated_at: string;
  updated_at: string;
}

export interface CloudNoteRow extends CloudNoteMeta {
  ciphertext: string;
  nonce: string;
}

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(fn, { body });
  if (error) throw new Error(error.message || `${fn} failed`);
  if (!data) throw new Error(`${fn} returned no data`);
  return data;
}

/** Encrypts and uploads the given notes. Returns count uploaded. */
export async function backupNotes(secret: string, notes: Note[]): Promise<number> {
  if (notes.length === 0) return 0;

  const payload = await Promise.all(notes.map(async (n) => {
    const { ciphertext, nonce } = await encryptPayload(secret, n);
    return {
      id: n.id,
      ciphertext,
      nonce,
      clientUpdatedAt: new Date(n.updatedAt).toISOString(),
    };
  }));

  // Chunk to keep payloads under edge function limits (~6MB).
  const CHUNK = 50;
  let total = 0;
  for (let i = 0; i < payload.length; i += CHUNK) {
    const slice = payload.slice(i, i + CHUNK);
    const res = await invoke<{ ok: boolean; count: number }>("cloud-backup", {
      secretKey: secret, notes: slice,
    });
    total += res.count ?? slice.length;
  }
  return total;
}

/** Lists cloud-backed note metadata for the given secret. */
export async function listCloudNotes(secret: string): Promise<CloudNoteMeta[]> {
  const res = await invoke<{ ok: boolean; notes: CloudNoteMeta[] }>("cloud-restore", {
    secretKey: secret, metadataOnly: true,
  });
  return res.notes ?? [];
}

/** Restores notes from cloud, decrypting locally. Returns decoded Note objects. */
export async function restoreNotes(secret: string, noteIds?: string[]): Promise<Note[]> {
  const res = await invoke<{ ok: boolean; notes: CloudNoteRow[] }>("cloud-restore", {
    secretKey: secret,
  });
  let rows = res.notes ?? [];
  if (noteIds && noteIds.length > 0) {
    const set = new Set(noteIds);
    rows = rows.filter(r => set.has(r.note_id));
  }
  const decoded: Note[] = [];
  for (const r of rows) {
    try {
      const n = await decryptPayload<Note>(secret, r.ciphertext, r.nonce);
      // Re-hydrate dates that JSON serialized as strings
      n.createdAt = new Date(n.createdAt);
      n.updatedAt = new Date(n.updatedAt);
      if (n.deletedAt) n.deletedAt = new Date(n.deletedAt);
      decoded.push(n);
    } catch (e) {
      console.warn("Failed to decrypt note", r.note_id, e);
    }
  }
  return decoded;
}

/** Delete specific notes (or all) from cloud. */
export async function deleteCloudNotes(secret: string, opts: { noteIds?: string[]; all?: boolean }): Promise<void> {
  await invoke<{ ok: boolean }>("cloud-delete", {
    secretKey: secret,
    noteIds: opts.noteIds,
    all: opts.all === true,
  });
}
