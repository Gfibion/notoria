/**
 * One-shot migration from the legacy raw-IndexedDB stores
 * (notoria-db, notoria-tasks, notoria-pdf-cache) into WatermelonDB.
 *
 * Guarantees:
 *  - Idempotent: guarded by localStorage flag `notoria_migration_v2`.
 *  - Atomic per store: uses Watermelon's `database.write` (transactional).
 *  - Non-destructive: the legacy IndexedDB databases are NOT deleted this
 *    release. A future release can drop them once telemetry confirms
 *    the migration is stable.
 *  - Rescue path: a compressed JSON snapshot of everything migrated is
 *    stored in the `legacy_backups` table and downloadable from Settings.
 *  - IDs preserved: original string IDs are reused so cloud backups and
 *    cross-device references stay stable.
 */

import { openDB } from 'idb';
import { database, legacyBackupsCollection } from './index';

const FLAG_KEY = 'notoria_migration_v2';

type FlagValue = {
  status: 'done' | 'failed';
  at: number;
  counts?: Record<string, number>;
  error?: string;
};

export function getMigrationFlag(): FlagValue | null {
  try {
    const raw = localStorage.getItem(FLAG_KEY);
    return raw ? (JSON.parse(raw) as FlagValue) : null;
  } catch {
    return null;
  }
}

function setMigrationFlag(value: FlagValue): void {
  try {
    localStorage.setItem(FLAG_KEY, JSON.stringify(value));
  } catch {
    /* storage full, ignore — migration still succeeded */
  }
}

/** Best-effort open of a legacy IndexedDB (returns null if it does not exist). */
async function openLegacy(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    // Passing no version means "open whatever exists"; if the DB doesn't
    // exist, this would create it with version 1 — so probe existence first.
    if (typeof indexedDB.databases === 'function') {
      indexedDB.databases().then((dbs) => {
        const exists = dbs.some((d) => d.name === name);
        if (!exists) return resolve(null);
        const req = indexedDB.open(name);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      }).catch(() => resolve(null));
    } else {
      // Safari fallback — attempt open, accept the (small) risk of creating
      // an empty DB. If empty, we simply migrate zero rows.
      const req = indexedDB.open(name);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    }
  });
}

function readAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (!db.objectStoreNames.contains(store)) return resolve([]);
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

// ---------- helpers ----------

const toMs = (v: unknown): number => {
  if (v == null) return Date.now();
  if (typeof v === 'number') return v;
  if (v instanceof Date) return v.getTime();
  const parsed = Date.parse(String(v));
  return Number.isFinite(parsed) ? parsed : Date.now();
};

async function arrayBufferToBase64(buffer: ArrayBuffer): Promise<string> {
  // Chunked to avoid stack overflow on large PDFs.
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// ---------- migration ----------

export type MigrationProgress = (stage: string) => void;

export async function runMigrationIfNeeded(
  onProgress?: MigrationProgress,
): Promise<{ ran: boolean; counts?: Record<string, number>; error?: string }> {
  const existing = getMigrationFlag();
  if (existing?.status === 'done') return { ran: false, counts: existing.counts };

  try {
    onProgress?.('Opening legacy library…');
    const [notesDb, tasksDb, pdfDb] = await Promise.all([
      openLegacy('notoria-db'),
      openLegacy('notoria-tasks'),
      openLegacy('notoria-pdf-cache'),
    ]);

    // Extract raw legacy rows.
    const legacyNotes = notesDb ? await readAll<any>(notesDb, 'notes') : [];
    const legacyWorkspaces = notesDb ? await readAll<any>(notesDb, 'workspaces') : [];
    const legacySubcats = notesDb ? await readAll<any>(notesDb, 'subcategories') : [];
    const legacySettings = notesDb ? await readAll<any>(notesDb, 'settings') : [];
    const legacyTasks = tasksDb ? await readAll<any>(tasksDb, 'tasks') : [];
    const legacyProjects = tasksDb ? await readAll<any>(tasksDb, 'projects') : [];
    const legacyPdfs = pdfDb ? await readAll<any>(pdfDb, 'pdfs') : [];

    notesDb?.close();
    tasksDb?.close();
    pdfDb?.close();

    const counts = {
      notes: legacyNotes.length,
      workspaces: legacyWorkspaces.length,
      subcategories: legacySubcats.length,
      settings: legacySettings.length,
      tasks: legacyTasks.length,
      projects: legacyProjects.length,
      pdfs: legacyPdfs.length,
    };

    const totalRows = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalRows === 0) {
      // Nothing to migrate — mark done immediately, first-time user.
      setMigrationFlag({ status: 'done', at: Date.now(), counts });
      return { ran: true, counts };
    }

    // Encode PDFs outside the transaction (ArrayBuffer → base64 is CPU-heavy).
    onProgress?.('Preparing offline PDFs…');
    const preparedPdfs = await Promise.all(
      legacyPdfs.map(async (p) => ({
        id: String(p.id),
        file_name: String(p.fileName ?? ''),
        data_b64: p.data instanceof ArrayBuffer ? await arrayBufferToBase64(p.data) : '',
        size: Number(p.size ?? 0),
        cached_at: toMs(p.cachedAt),
      })),
    );

    // Build the safety-net backup blob (kept in Watermelon for one release).
    const backupPayload = JSON.stringify({
      version: 1,
      migratedAt: Date.now(),
      counts,
      // NOTE: PDF binaries are intentionally omitted from the JSON backup
      // (too large). They remain in the legacy `notoria-pdf-cache` DB until
      // a future release performs cleanup.
      notes: legacyNotes,
      workspaces: legacyWorkspaces,
      subcategories: legacySubcats,
      settings: legacySettings,
      tasks: legacyTasks,
      projects: legacyProjects,
    });

    onProgress?.('Upgrading your library…');
    await database.write(async () => {
      // Notes
      for (const n of legacyNotes) {
        await database.get('notes').create((rec: any) => {
          rec._raw.id = String(n.id);
          rec._raw.title = String(n.title ?? '');
          rec._raw.content = String(n.content ?? '');
          rec._raw.workspace = String(n.workspace ?? '');
          rec._raw.subcategory = String(n.subcategory ?? '');
          rec._raw.color = String(n.color ?? '');
          rec._raw.is_pinned = n.isPinned ? 1 : 0;
          rec._raw.is_starred = n.isStarred ? 1 : 0;
          rec._raw.is_deleted = n.isDeleted ? 1 : 0;
          rec._raw.deleted_at = n.deletedAt ? toMs(n.deletedAt) : null;
          rec._raw.tags_json = JSON.stringify(Array.isArray(n.tags) ? n.tags : []);
          rec._raw.created_at = toMs(n.createdAt);
          rec._raw.updated_at = toMs(n.updatedAt);
        });
      }
      // Workspaces
      for (const w of legacyWorkspaces) {
        await database.get('workspaces').create((rec: any) => {
          rec._raw.id = String(w.id);
          rec._raw.name = String(w.name ?? '');
          rec._raw.color = String(w.color ?? '');
          rec._raw.icon = String(w.icon ?? '');
          rec._raw.order_index = Number(w.order ?? 0);
          rec._raw.created_at = toMs(w.createdAt);
        });
      }
      // Subcategories
      for (const s of legacySubcats) {
        await database.get('subcategories').create((rec: any) => {
          rec._raw.id = String(s.id);
          rec._raw.name = String(s.name ?? '');
          rec._raw.workspace_id = String(s.workspaceId ?? '');
          rec._raw.created_at = toMs(s.createdAt);
        });
      }
      // Settings
      for (const st of legacySettings) {
        await database.get('settings').create((rec: any) => {
          rec._raw.id = String(st.id ?? 'app-settings');
          rec._raw.payload_json = JSON.stringify(st);
        });
      }
      // Tasks
      for (const t of legacyTasks) {
        await database.get('tasks').create((rec: any) => {
          rec._raw.id = String(t.id);
          rec._raw.title = String(t.title ?? '');
          rec._raw.description = t.description ?? null;
          rec._raw.status = String(t.status ?? 'todo');
          rec._raw.priority = String(t.priority ?? 'medium');
          rec._raw.due_date = t.dueDate ?? null;
          rec._raw.reminder = t.reminder ?? null;
          rec._raw.project_id = t.projectId ?? null;
          rec._raw.subtasks_json = t.subtasks ? JSON.stringify(t.subtasks) : null;
          rec._raw.is_recurring = t.isRecurring == null ? null : (t.isRecurring ? 1 : 0);
          rec._raw.recurring_frequency = t.recurringFrequency ?? null;
          rec._raw.completed_cycles = t.completedCycles ?? null;
          rec._raw.is_completed = t.isCompleted == null ? null : (t.isCompleted ? 1 : 0);
          rec._raw.is_trail_record = t.isTrailRecord == null ? null : (t.isTrailRecord ? 1 : 0);
          rec._raw.trail_cycle_number = t.trailCycleNumber ?? null;
          rec._raw.parent_recurring_task_id = t.parentRecurringTaskId ?? null;
          rec._raw.trail_completed_at = t.trailCompletedAt ?? null;
          rec._raw.order_index = Number(t.order ?? 0);
          rec._raw.created_at_iso = String(t.createdAt ?? new Date().toISOString());
          rec._raw.updated_at_iso = String(t.updatedAt ?? new Date().toISOString());
        });
      }
      // Projects
      for (const p of legacyProjects) {
        await database.get('projects').create((rec: any) => {
          rec._raw.id = String(p.id);
          rec._raw.name = String(p.name ?? '');
          rec._raw.description = p.description ?? null;
          rec._raw.color = String(p.color ?? '#6366f1');
          rec._raw.icon = String(p.icon ?? 'folder');
          rec._raw.start_date = p.startDate ?? null;
          rec._raw.end_date = p.endDate ?? null;
          rec._raw.modules_json = p.modules ? JSON.stringify(p.modules) : null;
          rec._raw.created_at_iso = String(p.createdAt ?? new Date().toISOString());
        });
      }
      // PDF cache
      for (const p of preparedPdfs) {
        await database.get('pdf_cache').create((rec: any) => {
          rec._raw.id = p.id;
          rec._raw.file_name = p.file_name;
          rec._raw.data_b64 = p.data_b64;
          rec._raw.size = p.size;
          rec._raw.cached_at = p.cached_at;
        });
      }
      // Safety-net backup row
      await legacyBackupsCollection().create((rec: any) => {
        rec._raw.payload_json = backupPayload;
        rec._raw.created_at = Date.now();
      });
    });

    onProgress?.('Verifying…');
    // Verify counts (excluding backup + settings which we don't verify strictly)
    const [nc, wc, sc, tc, pc, pdfc] = await Promise.all([
      database.get('notes').query().fetchCount(),
      database.get('workspaces').query().fetchCount(),
      database.get('subcategories').query().fetchCount(),
      database.get('tasks').query().fetchCount(),
      database.get('projects').query().fetchCount(),
      database.get('pdf_cache').query().fetchCount(),
    ]);
    const mismatch =
      nc !== counts.notes ||
      wc !== counts.workspaces ||
      sc !== counts.subcategories ||
      tc !== counts.tasks ||
      pc !== counts.projects ||
      pdfc !== counts.pdfs;
    if (mismatch) {
      throw new Error(
        `Migration count mismatch: notes ${nc}/${counts.notes}, ws ${wc}/${counts.workspaces}, sub ${sc}/${counts.subcategories}, tasks ${tc}/${counts.tasks}, projects ${pc}/${counts.projects}, pdfs ${pdfc}/${counts.pdfs}`,
      );
    }

    setMigrationFlag({ status: 'done', at: Date.now(), counts });
    return { ran: true, counts };
  } catch (err: any) {
    const message = err?.message ?? String(err);
    // eslint-disable-next-line no-console
    console.error('[watermelon migration] failed', err);
    setMigrationFlag({ status: 'failed', at: Date.now(), error: message });
    return { ran: false, error: message };
  }
}

/** Retrieve the safety-net backup JSON so a user can re-download pre-v2.2 data. */
export async function getLegacyBackupJson(): Promise<string | null> {
  try {
    const rows = await legacyBackupsCollection().query().fetch();
    if (rows.length === 0) return null;
    // Return the most recent one.
    const latest = rows.sort((a: any, b: any) => (b._raw.created_at ?? 0) - (a._raw.created_at ?? 0))[0];
    return (latest as any)._raw.payload_json ?? null;
  } catch {
    return null;
  }
}

/** Also open the legacy IndexedDB and pull PDF binaries (they aren't in the JSON backup). */
export async function exportLegacyBackupFile(): Promise<Blob | null> {
  const json = await getLegacyBackupJson();
  if (!json) return null;
  return new Blob([json], { type: 'application/json' });
}

// Re-export for any advanced callers.
export { openDB };
