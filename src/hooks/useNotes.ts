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

  const loadNotes = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
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
    loadNotes(true);
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
      // Optimistic: add to local state
      setNotes(prev => [note, ...prev]);
      return note;
    },
    []
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
        // Optimistic: update in local state
        setNotes(prev =>
          prev.map(n => (n.id === id ? updated : n))
            .sort((a, b) => {
              if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
        );
        return updated;
      }
      return null;
    },
    []
  );

  const removeNote = useCallback(
    async (id: string) => {
      await softDeleteNote(id);
      // Optimistic: remove from local state
      setNotes(prev => prev.filter(n => n.id !== id));
    },
    []
  );

  const togglePin = useCallback(
    async (id: string) => {
      const existing = await getNote(id);
      if (existing) {
        const updated = { ...existing, isPinned: !existing.isPinned, updatedAt: new Date() };
        await saveNote(updated);
        setNotes(prev =>
          prev.map(n => (n.id === id ? updated : n))
            .sort((a, b) => {
              if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
              return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
            })
        );
      }
    },
    []
  );

  const toggleStar = useCallback(
    async (id: string) => {
      const existing = await getNote(id);
      if (existing) {
        const updated = { ...existing, isStarred: !existing.isStarred, updatedAt: new Date() };
        await saveNote(updated);
        if (starredOnly && updated.isStarred === false) {
          // Remove from starred view
          setNotes(prev => prev.filter(n => n.id !== id));
        } else {
          setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
        }
      }
    },
    [starredOnly]
  );

  const updateNoteColor = useCallback(
    async (id: string, color: string) => {
      const existing = await getNote(id);
      if (existing) {
        const updated = { ...existing, color, updatedAt: new Date() };
        await saveNote(updated);
        setNotes(prev => prev.map(n => (n.id === id ? updated : n)));
      }
    },
    []
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
    refresh: () => loadNotes(false),
  };
}
