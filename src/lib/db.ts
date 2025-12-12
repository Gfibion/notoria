import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Note {
  id: string;
  title: string;
  content: string;
  workspace: string;
  isPinned: boolean;
  isStarred: boolean;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: Date;
}

interface NotoriaDB extends DBSchema {
  notes: {
    key: string;
    value: Note;
    indexes: {
      'by-workspace': string;
      'by-updated': Date;
      'by-pinned': number;
    };
  };
  workspaces: {
    key: string;
    value: Workspace;
  };
}

const DB_NAME = 'notoria-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<NotoriaDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<NotoriaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<NotoriaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Notes store
      const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
      notesStore.createIndex('by-workspace', 'workspace');
      notesStore.createIndex('by-updated', 'updatedAt');
      notesStore.createIndex('by-pinned', 'isPinned');

      // Workspaces store
      db.createObjectStore('workspaces', { keyPath: 'id' });
    },
  });

  return dbInstance;
}

// Notes operations
export async function getAllNotes(): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAll('notes');
  return notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getNotesByWorkspace(workspaceId: string): Promise<Note[]> {
  const db = await getDB();
  const notes = await db.getAllFromIndex('notes', 'by-workspace', workspaceId);
  return notes.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

export async function getNote(id: string): Promise<Note | undefined> {
  const db = await getDB();
  return db.get('notes', id);
}

export async function saveNote(note: Note): Promise<void> {
  const db = await getDB();
  await db.put('notes', note);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('notes', id);
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
  return db.getAll('workspaces');
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

// Initialize default workspaces
export async function initializeDefaultWorkspaces(): Promise<void> {
  const workspaces = await getAllWorkspaces();
  if (workspaces.length === 0) {
    const defaults: Workspace[] = [
      { id: 'personal', name: 'Personal', color: '#C4A052', icon: 'user', createdAt: new Date() },
      { id: 'work', name: 'Work', color: '#64748B', icon: 'briefcase', createdAt: new Date() },
      { id: 'ideas', name: 'Ideas', color: '#8B5CF6', icon: 'lightbulb', createdAt: new Date() },
      { id: 'projects', name: 'Projects', color: '#059669', icon: 'folder', createdAt: new Date() },
    ];
    for (const ws of defaults) {
      await saveWorkspace(ws);
    }
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
