/**
 * Novaryn PDF offline cache — WatermelonDB-backed.
 *
 * Public interface identical to the previous `idb`-based implementation.
 * Binary PDFs are stored as base64 strings inside the `pdf_cache` table.
 * LRU eviction runs against `cached_at` to keep the cache under
 * MAX_CACHE_SIZE_MB.
 */

import { Q } from '@nozbe/watermelondb';
import { database, pdfCacheCollection } from './watermelon';

export interface CachedPDF {
  id: string;
  fileName: string;
  data: ArrayBuffer;
  size: number;
  cachedAt: Date;
}

const MAX_CACHE_SIZE_MB = 100;

// ---------- base64 <-> ArrayBuffer ----------

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// ---------- id helper ----------

export function generatePDFId(fileName: string, size: number): string {
  return `${fileName}-${size}`;
}

// ---------- reads ----------

export async function getCachedPDF(id: string): Promise<CachedPDF | undefined> {
  try {
    const rec = await pdfCacheCollection().find(id);
    const r = (rec as any)._raw;
    return {
      id: r.id,
      fileName: r.file_name ?? '',
      data: base64ToArrayBuffer(r.data_b64 ?? ''),
      size: Number(r.size ?? 0),
      cachedAt: new Date(r.cached_at ?? Date.now()),
    };
  } catch {
    return undefined;
  }
}

export async function isPDFCached(id: string): Promise<boolean> {
  try {
    await pdfCacheCollection().find(id);
    return true;
  } catch {
    return false;
  }
}

export async function getAllCachedPDFs(): Promise<Omit<CachedPDF, 'data'>[]> {
  const rows = await pdfCacheCollection().query().fetch();
  return rows.map((rec: any) => ({
    id: rec._raw.id,
    fileName: rec._raw.file_name ?? '',
    size: Number(rec._raw.size ?? 0),
    cachedAt: new Date(rec._raw.cached_at ?? Date.now()),
  }));
}

export async function getTotalCacheSize(): Promise<number> {
  const rows = await pdfCacheCollection().query().fetch();
  return rows.reduce((total: number, r: any) => total + Number(r._raw.size ?? 0), 0);
}

// ---------- writes ----------

async function enforceMaxCacheSize(newFileSize: number): Promise<void> {
  const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
  let totalSize = await getTotalCacheSize();
  if (totalSize + newFileSize <= maxBytes) return;

  const rows = await pdfCacheCollection().query().fetch();
  rows.sort((a: any, b: any) => Number(a._raw.cached_at ?? 0) - Number(b._raw.cached_at ?? 0));

  await database.write(async () => {
    for (const rec of rows) {
      if (totalSize + newFileSize <= maxBytes) break;
      const size = Number((rec as any)._raw.size ?? 0);
      await rec.destroyPermanently();
      totalSize -= size;
    }
  });
}

export async function cachePDF(pdf: CachedPDF): Promise<void> {
  await enforceMaxCacheSize(pdf.size);
  const b64 = arrayBufferToBase64(pdf.data);
  await database.write(async () => {
    try {
      const rec = await pdfCacheCollection().find(pdf.id);
      await rec.update((r: any) => {
        r._setRaw('file_name', pdf.fileName);
        r._setRaw('data_b64', b64);
        r._setRaw('size', pdf.size);
        r._setRaw('cached_at', pdf.cachedAt ? pdf.cachedAt.getTime() : Date.now());
      });
    } catch {
      await pdfCacheCollection().create((r: any) => {
        r._raw.id = pdf.id;
        r._setRaw('file_name', pdf.fileName);
        r._setRaw('data_b64', b64);
        r._setRaw('size', pdf.size);
        r._setRaw('cached_at', pdf.cachedAt ? pdf.cachedAt.getTime() : Date.now());
      });
    }
  });
}

export async function removeCachedPDF(id: string): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await pdfCacheCollection().find(id);
      await rec.destroyPermanently();
    } catch {
      /* not found */
    }
  });
}

export async function clearPDFCache(): Promise<void> {
  const rows = await pdfCacheCollection().query().fetch();
  if (rows.length === 0) return;
  await database.write(async () => {
    for (const rec of rows) await rec.destroyPermanently();
  });
}

// ---------- formatting helper (unchanged) ----------

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
