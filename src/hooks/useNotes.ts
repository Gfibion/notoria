import { useState, useEffect, useCallback } from 'react';
import {
  Note,
  getAllNotes,
  getNotesByWorkspace,
  getStarredNotes,
  getNote,
  saveNote,
  softDeleteNote,
  searchNotes,
  generateId,
} from '@/lib/db';

export function useNotes(workspaceId?: string, starredOnly?: boolean) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      setLoading(true);
      let data: Note[];
      if (starredOnly) {
        data = await getStarredNotes();
      } else if (workspaceId) {
        data = await getNotesByWorkspace(workspaceId);
      } else {
        data = await getAllNotes();
      }
      setNotes(data);
      setError(null);
    } catch (err) {
      setError('Failed to load notes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, starredOnly]);

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
        subcategory: '',
        color: '',
        isPinned: false,
        isStarred: false,
        isDeleted: false,
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
      await softDeleteNote(id);
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

  const toggleStar = useCallback(
    async (id: string) => {
      const existing = await getNote(id);
      if (existing) {
        await updateNote(id, { isStarred: !existing.isStarred });
      }
    },
    [updateNote]
  );

  const updateNoteColor = useCallback(
    async (id: string, color: string) => {
      await updateNote(id, { color });
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
    toggleStar,
    updateNoteColor,
    search,
    refresh: loadNotes,
  };
}