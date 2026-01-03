import { useState, useEffect, useCallback } from 'react';
import {
  Workspace,
  getAllWorkspaces,
  saveWorkspace,
  deleteWorkspace,
  initializeDefaultWorkspaces,
  generateId,
  reorderWorkspaces,
} from '@/lib/db';

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWorkspaces = useCallback(async () => {
    try {
      setLoading(true);
      await initializeDefaultWorkspaces();
      const data = await getAllWorkspaces();
      setWorkspaces(data);
      setError(null);
    } catch (err) {
      setError('Failed to load workspaces');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaces();
  }, [loadWorkspaces]);

  const createWorkspace = useCallback(
    async (name: string, color: string, icon: string) => {
      const existingWorkspaces = workspaces;
      const maxOrder = existingWorkspaces.length > 0 
        ? Math.max(...existingWorkspaces.map(w => w.order ?? 0)) 
        : -1;
      const workspace: Workspace = {
        id: generateId(),
        name,
        color,
        icon,
        order: maxOrder + 1,
        createdAt: new Date(),
      };
      await saveWorkspace(workspace);
      await loadWorkspaces();
      return workspace;
    },
    [workspaces, loadWorkspaces]
  );

  const updateWorkspace = useCallback(
    async (id: string, updates: Partial<Omit<Workspace, 'id' | 'createdAt'>>) => {
      const existing = workspaces.find((ws) => ws.id === id);
      if (existing) {
        const updated: Workspace = {
          ...existing,
          ...updates,
        };
        await saveWorkspace(updated);
        await loadWorkspaces();
        return updated;
      }
      return null;
    },
    [workspaces, loadWorkspaces]
  );

  const removeWorkspace = useCallback(
    async (id: string) => {
      await deleteWorkspace(id);
      await loadWorkspaces();
    },
    [loadWorkspaces]
  );

  const reorder = useCallback(
    async (orderedIds: string[]) => {
      await reorderWorkspaces(orderedIds);
      await loadWorkspaces();
    },
    [loadWorkspaces]
  );

  return {
    workspaces,
    loading,
    error,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    reorder,
    refresh: loadWorkspaces,
  };
}
