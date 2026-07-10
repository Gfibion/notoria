import { Model } from '@nozbe/watermelondb';

/**
 * Minimal Watermelon models — no decorators, no babel config required.
 *
 * The app never touches these models directly; the adapter layer in
 * `src/lib/db.ts`, `src/lib/tasks-db.ts`, `src/lib/pdf-cache-db.ts`
 * reads/writes fields via `record._raw` and returns plain TS objects
 * that match the existing exported interfaces.
 */

export class NoteModel extends Model {
  static table = 'notes';
}
export class WorkspaceModel extends Model {
  static table = 'workspaces';
}
export class SubcategoryModel extends Model {
  static table = 'subcategories';
}
export class SettingsModel extends Model {
  static table = 'settings';
}
export class TaskModel extends Model {
  static table = 'tasks';
}
export class ProjectModel extends Model {
  static table = 'projects';
}
export class PdfCacheModel extends Model {
  static table = 'pdf_cache';
}
export class LegacyBackupModel extends Model {
  static table = 'legacy_backups';
}
