import { useState, useEffect, useCallback } from 'react';
import {
  Workspace,
  getAllWorkspaces,
  saveWorkspace,
  deleteWorkspace,
  initializeDefaultWorkspaces,
  generateId,
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
      const workspace: Workspace = {
        id: generateId(),
        name,
        color,
        icon,
        createdAt: new Date(),
      };
      await saveWorkspace(workspace);
      await loadWorkspaces();
      return workspace;
    },
    [loadWorkspaces]
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

  return {
    workspaces,
    loading,
    error,
    createWorkspace,
    updateWorkspace,
    removeWorkspace,
    refresh: loadWorkspaces,
  };
}
