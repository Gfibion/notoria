import { useState, useEffect, useCallback } from 'react';
import {
  Note,
  getAllNotes,
  getNotesByWorkspace,
  getNote,
  saveNote,
  deleteNote,
  searchNotes,
  generateId,
} from '@/lib/db';

export function useNotes(workspaceId?: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = workspaceId
        ? await getNotesByWorkspace(workspaceId)
        : await getAllNotes();
      setNotes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const createNote = useCallback(
    async (title: string, content: string, workspace: string, tags: string[] = []) => {
      const note: Note = {
        id: generateId(),
        title,
        content,
        workspace,
        isPinned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        tags,
      };
      await saveNote(note);
      await loadNotes();
      return note;
    },
    [loadNotes]
  );

  const updateNote = useCallback(
    async (id: string, updates: Partial<Omit<Note, 'id' | 'createdAt'>>) => {
      const existing = await getNote(id);
      if (existing) {
        const updated: Note = {
          ...existing,
          ...updates,
          updatedAt: new Date(),
        };
        await saveNote(updated);
        await loadNotes();
        return updated;
      }
      return null;
    },
    [loadNotes]
  );

  const removeNote = useCallback(
    async (id: string) => {
      await deleteNote(id);
      await loadNotes();
    },
    [loadNotes]
  );

  const togglePin = useCallback(
    async (id: string) => {
      const existing = await getNote(id);
      if (existing) {
        await updateNote(id, { isPinned: !existing.isPinned });
      }
    },
    [updateNote]
  );

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      return [];
    }
    return searchNotes(query);
  }, []);

  return {
    notes,
    loading,
    error,
    createNote,
    updateNote,
    removeNote,
    togglePin,
    search,
    refresh: loadNotes,
  };
}
