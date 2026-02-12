import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Note {
  id: string;
  title: string;
  content: string;
  workspace: string; // Can be empty for uncategorized notes
  subcategory: string; // Subcategory within the workspace
  color: string; // Note card background color
  isPinned: boolean;
  isStarred: boolean;
  isDeleted: boolean; // Soft delete flag
  deletedAt?: Date; // When the note was deleted
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
}

interface NotoriaDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-workspace': string;
      'by-updated': Date;
      'by-pinned': number;
      'by-deleted': number;
    };
  };
  workspaces: {
    key: string;
    value: Workspace;
  };
  subcategories: {
    key: string;
    value: Subcategory;
    indexes: {
      'by-workspace': string;
    };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
}

const DB_NAME = 'notoria-db';
const DB_VERSION = 3;

let dbInstance: IDBPDatabase<NotoriaDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NotoriaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<NotoriaDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
        notesStore.createIndex('by-workspace', 'workspace');
        notesStore.createIndex('by-updated', 'updatedAt');
        notesStore.createIndex('by-pinned', 'isPinned');
        notesStore.createIndex('by-deleted', 'isDeleted');
      }

      // Workspaces store
      if (!db.objectStoreNames.contains('workspaces')) {
        db.createObjectStore('workspaces', { keyPath: 'id' });
      }

      // Subcategories store
      if (!db.objectStoreNames.contains('subcategories')) {
        const subcatStore = db.createObjectStore('subcategories', { keyPath: 'id' });
        subcatStore.createIndex('by-workspace', 'workspaceId');
      }

      // Settings store (new in version 3)
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// Notes operations
export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  return notes
    .filter(note => !note.isDeleted)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export async function getNotesByWorkspace(workspaceId: string): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex('notes', 'by-workspace', workspaceId);
  return notes
    .filter(note => !note.isDeleted)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export async function getStarredNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  return notes
    .filter(note => note.isStarred && !note.isDeleted)
    .sort((a, b) => {
      if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
}

export async function getDeletedNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  return notes
    .filter(note => note.isDeleted)
    .sort((a, b) => {
      const aDeletedAt = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
      const bDeletedAt = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
      return bDeletedAt - aDeletedAt;
    });
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function saveNote(note: Note): Promise<void> {
  const db = await getDB();
  // Ensure new fields have defaults for backwards compatibility
  const noteWithDefaults: Note = {
    ...note,
    subcategory: note.subcategory || '',
    color: note.color || '',
    isDeleted: note.isDeleted ?? false,
    isStarred: note.isStarred ?? false,
  };
  await db.put('notes', noteWithDefaults);
}

// Soft delete - move to trash
export async function softDeleteNote(id: string): Promise<void> {
  const db = await getDB();
  const note = await db.get('notes', id);
  if (note) {
    note.isDeleted = true;
    note.deletedAt = new Date();
    await db.put('notes', note);
  }
}

// Restore from trash
export async function restoreNote(id: string): Promise<void> {
  const db = await getDB();
  const note = await db.get('notes', id);
  if (note) {
    note.isDeleted = false;
    note.deletedAt = undefined;
    await db.put('notes', note);
  }
}

// Permanent delete
export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
}

// Auto-delete notes older than 30 days
export async function cleanupOldDeletedNotes(): Promise<void> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  for (const note of notes) {
    if (note.isDeleted && note.deletedAt && new Date(note.deletedAt) < thirtyDaysAgo) {
      await db.delete('notes', note.id);
    }
  }
}

export async function searchNotes(query: string): Promise<Note[]> {
  const notes = await getAllNotes();
  const lowerQuery = query.toLowerCase();
  return notes.filter(
    (note) =>
      note.title.toLowerCase().includes(lowerQuery) ||
      note.content.toLowerCase().includes(lowerQuery) ||
      note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// Workspaces operations
export async function getAllWorkspaces(): Promise<Workspace[]> {
  const db = await getDB();
  const workspaces = await db.getAll('workspaces');
  return workspaces.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export async function getWorkspace(id: string): Promise<Workspace | undefined> {
  const db = await getDB();
  return db.get('workspaces', id);
}

export async function saveWorkspace(workspace: Workspace): Promise<void> {
  const db = await getDB();
  await db.put('workspaces', workspace);
}

export async function deleteWorkspace(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('workspaces', id);
}

// Subcategories operations
export async function getAllSubcategories(): Promise<Subcategory[]> {
  const db = await getDB();
  return db.getAll('subcategories');
}

export async function getSubcategoriesByWorkspace(workspaceId: string): Promise<Subcategory[]> {
  const db = await getDB();
  return db.getAllFromIndex('subcategories', 'by-workspace', workspaceId);
}

export async function saveSubcategory(subcategory: Subcategory): Promise<void> {
  const db = await getDB();
  await db.put('subcategories', subcategory);
}

export async function deleteSubcategory(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('subcategories', id);
}

// Settings operations
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', 'app-settings');
  return settings || {
    id: 'app-settings',
    theme: 'default',
    fontFamily: 'cambria',
    fontSize: 'medium',
  };
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', { ...settings, id: 'app-settings' });
}

// Initialize default workspaces
export async function initializeDefaultWorkspaces(): Promise<void> {
  const workspaces = await getAllWorkspaces();
  if (workspaces.length === 0) {
    const defaults: Workspace[] = [
      { id: 'personal', name: 'Personal', color: '#C4A052', icon: 'user', order: 0, createdAt: new Date() },
      { id: 'work', name: 'Work', color: '#64748B', icon: 'briefcase', order: 1, createdAt: new Date() },
      { id: 'ideas', name: 'Ideas', color: '#8B5CF6', icon: 'lightbulb', order: 2, createdAt: new Date() },
      { id: 'projects', name: 'Projects', color: '#059669', icon: 'folder', order: 3, createdAt: new Date() },
    ];
    for (const ws of defaults) {
      await saveWorkspace(ws);
    }
  }
}

// Reorder workspaces
export async function reorderWorkspaces(orderedIds: string[]): Promise<void> {
  const db = await getDB();
  const workspaces = await db.getAll('workspaces');
  for (const ws of workspaces) {
    const newOrder = orderedIds.indexOf(ws.id);
    if (newOrder !== -1 && ws.order !== newOrder) {
      ws.order = newOrder;
      await db.put('workspaces', ws);
    }
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Note color presets
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

// Export note as TXT
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

// Import from TXT
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
