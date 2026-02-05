import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface CachedPDF {
  id: string; // Unique identifier based on filename + size
  fileName: string;
  data: ArrayBuffer;
  size: number;
  cachedAt: Date;
}

interface PDFCacheDB extends DBSchema {
  pdfs: {
    key: string;
    value: CachedPDF;
    indexes: {
      'by-cached-at': Date;
    };
  };
}

const DB_NAME = 'notoria-pdf-cache';
const DB_VERSION = 1;
const MAX_CACHE_SIZE_MB = 100; // Maximum cache size in MB

let dbInstance: IDBPDatabase<PDFCacheDB> | null = null;

async function getDB(): Promise<IDBPDatabase<PDFCacheDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PDFCacheDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pdfs')) {
        const store = db.createObjectStore('pdfs', { keyPath: 'id' });
        store.createIndex('by-cached-at', 'cachedAt');
      }
    },
  });

  return dbInstance;
}

// Generate a unique ID for a PDF based on filename and size
export function generatePDFId(fileName: string, size: number): string {
  return `${fileName}-${size}`;
}

// Get a cached PDF
export async function getCachedPDF(id: string): Promise<CachedPDF | undefined> {
  const db = await getDB();
  return db.get('pdfs', id);
}

// Check if a PDF is cached
export async function isPDFCached(id: string): Promise<boolean> {
  const db = await getDB();
  const pdf = await db.get('pdfs', id);
  return !!pdf;
}

// Save a PDF to cache
export async function cachePDF(pdf: CachedPDF): Promise<void> {
  const db = await getDB();
  
  // Check total cache size and clean up if needed
  await enforceMaxCacheSize(pdf.size);
  
  await db.put('pdfs', pdf);
}

// Remove a PDF from cache
export async function removeCachedPDF(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('pdfs', id);
}

// Get all cached PDFs (metadata only, without data)
export async function getAllCachedPDFs(): Promise<Omit<CachedPDF, 'data'>[]> {
  const db = await getDB();
  const pdfs = await db.getAll('pdfs');
  return pdfs.map(({ data, ...rest }) => rest);
}

// Get total cache size in bytes
export async function getTotalCacheSize(): Promise<number> {
  const db = await getDB();
  const pdfs = await db.getAll('pdfs');
  return pdfs.reduce((total, pdf) => total + pdf.size, 0);
}

// Enforce maximum cache size by removing oldest entries
async function enforceMaxCacheSize(newFileSize: number): Promise<void> {
  const db = await getDB();
  const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024;
  
  let totalSize = await getTotalCacheSize();
  
  // If adding new file would exceed limit, remove oldest entries
  if (totalSize + newFileSize > maxBytes) {
    const pdfs = await db.getAllFromIndex('pdfs', 'by-cached-at');
    
    for (const pdf of pdfs) {
      if (totalSize + newFileSize <= maxBytes) break;
      await db.delete('pdfs', pdf.id);
      totalSize -= pdf.size;
    }
  }
}

// Clear all cached PDFs
export async function clearPDFCache(): Promise<void> {
  const db = await getDB();
  await db.clear('pdfs');
}

// Format bytes to human readable string
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
