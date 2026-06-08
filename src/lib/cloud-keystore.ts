// Persistence layer for the wrapped user secret (PIN- or biometric-encrypted).
// Stored in IndexedDB under a dedicated DB so it survives even if the app's
// main notes DB is wiped — but never contains plaintext.
import { openDB, type IDBPDatabase } from "idb";
import type { WrappedSecret } from "./cloud-crypto";

const DB_NAME = "notoria-cloud-keystore";
const DB_VERSION = 1;
const STORE = "keystore";
const KEY = "user-secret";

let dbPromise: Promise<IDBPDatabase> | null = null;
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE);
        }
      },
    });
  }
  return dbPromise;
}

export async function saveWrappedSecret(wrapped: WrappedSecret): Promise<void> {
  const db = await getDB();
  await db.put(STORE, wrapped, KEY);
}

export async function loadWrappedSecret(): Promise<WrappedSecret | null> {
  const db = await getDB();
  const v = await db.get(STORE, KEY);
  return (v as WrappedSecret) ?? null;
}

export async function clearWrappedSecret(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, KEY);
}
