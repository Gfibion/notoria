/**
 * Notoria main data layer — WatermelonDB-backed.
 *
 * The exported interfaces and function signatures are unchanged from the
 * previous raw-IndexedDB implementation so no component or hook needs to
 * change. Under the hood we now use `@nozbe/watermelondb` which, on web,
 * still persists to IndexedDB via the LokiJS adapter but gives us a schema
 * system and a clear path to SQLite when the app is packaged with
 * Capacitor for native.
 */

import { Q } from '@nozbe/watermelondb';
import {
  database,
  notesCollection,
  workspacesCollection,
  subcategoriesCollection,
  settingsCollection,
} from './watermelon';

export interface Note {
  id: string;
  title: string;
  content: string;
  workspace: string;
  subcategory: string;
  color: string;
  isPinned: boolean;
  isStarred: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  createdAt: Date;
}

export interface Subcategory {
  id: string;
  name: string;
  workspaceId: string;
  createdAt: Date;
}

export interface AppSettings {
  id: string;
  theme: 'default' | 'dark' | 'purple-gradient';
  fontFamily: 'cambria' | 'times' | 'calibri' | 'georgia';
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  uiLayout: 'auto' | 'desktop' | 'mobile';
}

// ---------- row <-> interface mappers ----------

function rowToNote(rec: any): Note {
  const r = rec._raw;
  let tags: string[] = [];
  try {
    tags = r.tags_json ? JSON.parse(r.tags_json) : [];
    if (!Array.isArray(tags)) tags = [];
  } catch {
    tags = [];
  }
  return {
    id: r.id,
    title: r.title ?? '',
    content: r.content ?? '',
    workspace: r.workspace ?? '',
    subcategory: r.subcategory ?? '',
    color: r.color ?? '',
    isPinned: !!r.is_pinned,
    isStarred: !!r.is_starred,
    isDeleted: !!r.is_deleted,
    deletedAt: r.deleted_at ? new Date(r.deleted_at) : undefined,
    createdAt: new Date(r.created_at ?? Date.now()),
    updatedAt: new Date(r.updated_at ?? Date.now()),
    tags,
  };
}

function writeNoteFields(rec: any, note: Note): void {
  rec._setRaw('title', note.title ?? '');
  rec._setRaw('content', note.content ?? '');
  rec._setRaw('workspace', note.workspace ?? '');
  rec._setRaw('subcategory', note.subcategory ?? '');
  rec._setRaw('color', note.color ?? '');
  rec._setRaw('is_pinned', note.isPinned ? 1 : 0);
  rec._setRaw('is_starred', note.isStarred ? 1 : 0);
  rec._setRaw('is_deleted', note.isDeleted ? 1 : 0);
  rec._setRaw('deleted_at', note.deletedAt ? note.deletedAt.getTime() : null);
  rec._setRaw('tags_json', JSON.stringify(Array.isArray(note.tags) ? note.tags : []));
  rec._setRaw('created_at', note.createdAt ? new Date(note.createdAt).getTime() : Date.now());
  rec._setRaw('updated_at', note.updatedAt ? new Date(note.updatedAt).getTime() : Date.now());
}

function rowToWorkspace(rec: any): Workspace {
  const r = rec._raw;
  return {
    id: r.id,
    name: r.name ?? '',
    color: r.color ?? '',
    icon: r.icon ?? '',
    order: Number(r.order_index ?? 0),
    createdAt: new Date(r.created_at ?? Date.now()),
  };
}

function rowToSubcategory(rec: any): Subcategory {
  const r = rec._raw;
  return {
    id: r.id,
    name: r.name ?? '',
    workspaceId: r.workspace_id ?? '',
    createdAt: new Date(r.created_at ?? Date.now()),
  };
}

// ---------- notes ----------

function sortNotes(a: Note, b: Note): number {
  if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export async function getAllNotes(): Promise<Note[]> {
  const rows = await notesCollection().query().fetch();
  const filtered = rows.map(rowToNote).filter((n) => !n.isDeleted);
  return filtered.sort(sortNotes);
  return rows.map(rowToNote).sort(sortNotes);
}

export async function getNotesByWorkspace(workspaceId: string): Promise<Note[]> {
  const rows = await notesCollection()
    .query(Q.where('workspace', workspaceId), Q.where('is_deleted', false))
    .fetch();
  return rows.map(rowToNote).sort(sortNotes);
}

export async function getStarredNotes(): Promise<Note[]> {
  const rows = await notesCollection()
    .query(Q.where('is_starred', true), Q.where('is_deleted', false))
    .fetch();
  return rows.map(rowToNote).sort(sortNotes);
}

export async function getDeletedNotes(): Promise<Note[]> {
  const rows = await notesCollection().query(Q.where('is_deleted', true)).fetch();
  return rows
    .map(rowToNote)
    .sort(
      (a, b) =>
        (b.deletedAt ? b.deletedAt.getTime() : 0) - (a.deletedAt ? a.deletedAt.getTime() : 0),
    );
}

export async function getNote(id: string): Promise<Note | undefined> {
  try {
    const rec = await notesCollection().find(id);
    return rowToNote(rec);
  } catch {
    return undefined;
  }
}

export async function saveNote(note: Note): Promise<void> {
  const normalized: Note = {
    ...note,
    subcategory: note.subcategory || '',
    color: note.color || '',
    isDeleted: note.isDeleted ?? false,
    isStarred: note.isStarred ?? false,
  };
  await database.write(async () => {
    try {
      const rec = await notesCollection().find(note.id);
      await rec.update((r: any) => writeNoteFields(r, normalized));
    } catch {
      await notesCollection().create((r: any) => {
        r._raw.id = note.id;
        writeNoteFields(r, normalized);
      });
    }
  });
}

export async function softDeleteNote(id: string): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await notesCollection().find(id);
      await rec.update((r: any) => {
        r._setRaw('is_deleted', 1);
        r._setRaw('deleted_at', Date.now());
      });
    } catch {
      /* not found */
    }
  });
}

export async function restoreNote(id: string): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await notesCollection().find(id);
      await rec.update((r: any) => {
        r._setRaw('is_deleted', 0);
        r._setRaw('deleted_at', null);
      });
    } catch {
      /* not found */
    }
  });
}

export async function deleteNote(id: string): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await notesCollection().find(id);
      await rec.destroyPermanently();
    } catch {
      /* not found */
    }
  });
}

export async function cleanupOldDeletedNotes(): Promise<void> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const rows = await notesCollection()
    .query(Q.where('is_deleted', true), Q.where('deleted_at', Q.lt(thirtyDaysAgo)))
    .fetch();
  if (rows.length === 0) return;
  await database.write(async () => {
    for (const rec of rows) await rec.destroyPermanently();
  });
}

export async function searchNotes(query: string): Promise<Note[]> {
  const notes = await getAllNotes();
  const lowerQuery = query.toLowerCase();
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
}

// ---------- workspaces ----------

export async function getAllWorkspaces(): Promise<Workspace[]> {
  const rows = await workspacesCollection().query().fetch();
  return rows.map(rowToWorkspace).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  try {
    const rec = await workspacesCollection().find(id);
    return rowToWorkspace(rec);
  } catch {
    return undefined;
  }
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await workspacesCollection().find(workspace.id);
      await rec.update((r: any) => {
        r._setRaw('name', workspace.name ?? '');
        r._setRaw('color', workspace.color ?? '');
        r._setRaw('icon', workspace.icon ?? '');
        r._setRaw('order_index', Number(workspace.order ?? 0));
        r._setRaw('created_at', workspace.createdAt ? new Date(workspace.createdAt).getTime() : Date.now());
      });
    } catch {
      await workspacesCollection().create((r: any) => {
        r._raw.id = workspace.id;
        r._setRaw('name', workspace.name ?? '');
        r._setRaw('color', workspace.color ?? '');
        r._setRaw('icon', workspace.icon ?? '');
        r._setRaw('order_index', Number(workspace.order ?? 0));
        r._setRaw('created_at', workspace.createdAt ? new Date(workspace.createdAt).getTime() : Date.now());
      });
    }
  });
}

export async function deleteWorkspace(id: string): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await workspacesCollection().find(id);
      await rec.destroyPermanently();
    } catch {
      /* not found */
    }
  });
}

// ---------- subcategories ----------

export async function getAllSubcategories(): Promise<Subcategory[]> {
  const rows = await subcategoriesCollection().query().fetch();
  return rows.map(rowToSubcategory);
}

export async function getSubcategoriesByWorkspace(workspaceId: string): Promise<Subcategory[]> {
  const rows = await subcategoriesCollection()
    .query(Q.where('workspace_id', workspaceId))
    .fetch();
  return rows.map(rowToSubcategory);
}

export async function saveSubcategory(subcategory: Subcategory): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await subcategoriesCollection().find(subcategory.id);
      await rec.update((r: any) => {
        r._setRaw('name', subcategory.name ?? '');
        r._setRaw('workspace_id', subcategory.workspaceId ?? '');
        r._setRaw('created_at', subcategory.createdAt ? new Date(subcategory.createdAt).getTime() : Date.now());
      });
    } catch {
      await subcategoriesCollection().create((r: any) => {
        r._raw.id = subcategory.id;
        r._setRaw('name', subcategory.name ?? '');
        r._setRaw('workspace_id', subcategory.workspaceId ?? '');
        r._setRaw('created_at', subcategory.createdAt ? new Date(subcategory.createdAt).getTime() : Date.now());
      });
    }
  });
}

export async function deleteSubcategory(id: string): Promise<void> {
  await database.write(async () => {
    try {
      const rec = await subcategoriesCollection().find(id);
      await rec.destroyPermanently();
    } catch {
      /* not found */
    }
  });
}

// ---------- settings ----------

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app-settings',
  theme: 'default',
  fontFamily: 'cambria',
  fontSize: 'medium',
  uiLayout: 'auto',
};

export async function getSettings(): Promise<AppSettings> {
  try {
    const rec = await settingsCollection().find('app-settings');
    const raw = (rec as any)._raw.payload_json;
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as AppSettings;
    return { ...DEFAULT_SETTINGS, ...parsed, id: 'app-settings' };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const payload = { ...settings, id: 'app-settings' };
  await database.write(async () => {
    try {
      const rec = await settingsCollection().find('app-settings');
      await rec.update((r: any) => {
        r._setRaw('payload_json', JSON.stringify(payload));
      });
    } catch {
      await settingsCollection().create((r: any) => {
        r._raw.id = 'app-settings';
        r._setRaw('payload_json', JSON.stringify(payload));
      });
    }
  });
}

// ---------- bootstrap ----------

export async function initializeDefaultWorkspaces(): Promise<void> {
  const workspaces = await getAllWorkspaces();
  if (workspaces.length === 0) {
    const defaults: Workspace[] = [
      { id: 'personal', name: 'Personal', color: '#C4A052', icon: 'user', order: 0, createdAt: new Date() },
      { id: 'work', name: 'Work', color: '#64748B', icon: 'briefcase', order: 1, createdAt: new Date() },
      { id: 'ideas', name: 'Ideas', color: '#8B5CF6', icon: 'lightbulb', order: 2, createdAt: new Date() },
      { id: 'projects', name: 'Projects', color: '#059669', icon: 'folder', order: 3, createdAt: new Date() },
    ];
    for (const ws of defaults) await saveWorkspace(ws);
  }
}

export async function reorderWorkspaces(orderedIds: string[]): Promise<void> {
  const rows = await workspacesCollection().query().fetch();
  await database.write(async () => {
    for (const rec of rows) {
      const newOrder = orderedIds.indexOf((rec as any)._raw.id);
      if (newOrder !== -1 && (rec as any)._raw.order_index !== newOrder) {
        await rec.update((r: any) => {
          r._setRaw('order_index', newOrder);
        });
      }
    }
  });
}

// ---------- helpers (unchanged public surface) ----------

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const NOTE_COLORS = [
  { name: 'None', value: '' },
  { name: 'Rose', value: '#fecdd3' },
  { name: 'Amber', value: '#fde68a' },
  { name: 'Lime', value: '#bef264' },
  { name: 'Cyan', value: '#a5f3fc' },
  { name: 'Violet', value: '#c4b5fd' },
  { name: 'Pink', value: '#f9a8d4' },
  { name: 'Slate', value: '#cbd5e1' },
];

export function exportNoteAsTxt(note: Note): void {
  const content = note.content.replace(/<[^>]*>/g, '\n').replace(/\n+/g, '\n').trim();
  const text = `${note.title || 'Untitled'}\n\n${content}`;
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${note.title || 'note'}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importFromTxt(file: File): Promise<{ title: string; content: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const title = lines[0]?.trim() || 'Imported Note';
      const content = lines.slice(1).join('<br>').trim();
      resolve({ title, content });
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/** Kept for backwards compatibility with any caller that used to reach for a raw DB. */
export async function getDB(): Promise<never> {
  throw new Error('getDB() is no longer supported — use the exported helpers instead.');
}
