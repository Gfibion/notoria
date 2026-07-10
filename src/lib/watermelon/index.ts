import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { notoriaSchema } from './schema';
import {
  NoteModel,
  WorkspaceModel,
  SubcategoryModel,
  SettingsModel,
  TaskModel,
  ProjectModel,
  PdfCacheModel,
  LegacyBackupModel,
} from './models';

/**
 * Notoria WatermelonDB singleton.
 *
 * On the web we use LokiJSAdapter (IndexedDB-backed) — this keeps behaviour
 * identical to the previous raw-IndexedDB layer while giving us a schema/
 * migration system and preparing for a future Capacitor native build,
 * where the adapter would be swapped for SQLiteAdapter.
 *
 * IMPORTANT: this module must be safe to import at boot before the legacy
 * IndexedDB migration runs. It only opens the Watermelon DB lazily on the
 * first collection access.
 */

const adapter = new LokiJSAdapter({
  schema: notoriaSchema,
  dbName: 'notoria-wmdb',
  // Use incremental IndexedDB persistence for resilience against tab crashes.
  useIncrementalIndexedDB: true,
  useWebWorker: false,
  onQuotaExceededError: (error) => {
    // eslint-disable-next-line no-console
    console.error('[watermelon] IndexedDB quota exceeded', error);
  },
  onSetUpError: (error) => {
    // eslint-disable-next-line no-console
    console.error('[watermelon] adapter setup error', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [
    NoteModel,
    WorkspaceModel,
    SubcategoryModel,
    SettingsModel,
    TaskModel,
    ProjectModel,
    PdfCacheModel,
    LegacyBackupModel,
  ],
});

// Convenience collection getters.
export const notesCollection = () => database.get<NoteModel>('notes');
export const workspacesCollection = () => database.get<WorkspaceModel>('workspaces');
export const subcategoriesCollection = () => database.get<SubcategoryModel>('subcategories');
export const settingsCollection = () => database.get<SettingsModel>('settings');
export const tasksCollection = () => database.get<TaskModel>('tasks');
export const projectsCollection = () => database.get<ProjectModel>('projects');
export const pdfCacheCollection = () => database.get<PdfCacheModel>('pdf_cache');
export const legacyBackupsCollection = () => database.get<LegacyBackupModel>('legacy_backups');
