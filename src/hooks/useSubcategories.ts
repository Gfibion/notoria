import { useState, useEffect, useCallback } from 'react';
import {
  Subcategory,
  getAllSubcategories,
  getSubcategoriesByWorkspace,
  saveSubcategory,
  deleteSubcategory,
  generateId,
} from '@/lib/db';

export function useSubcategories(workspaceId?: string) {
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSubcategories = useCallback(async () => {
    try {
      setLoading(true);
      const data = workspaceId
        ? await getSubcategoriesByWorkspace(workspaceId)
        : await getAllSubcategories();
      setSubcategories(data);
    } catch (err) {
      console.error('Failed to load subcategories:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadSubcategories();
  }, [loadSubcategories]);

  const createSubcategory = useCallback(
    async (name: string, wsId: string) => {
      const subcategory: Subcategory = {
        id: generateId(),
        name,
        workspaceId: wsId,
        createdAt: new Date(),
      };
      await saveSubcategory(subcategory);
      await loadSubcategories();
      return subcategory;
    },
    [loadSubcategories]
  );

  const removeSubcategory = useCallback(
    async (id: string) => {
      await deleteSubcategory(id);
      await loadSubcategories();
    },
    [loadSubcategories]
  );

  return {
    subcategories,
    loading,
    createSubcategory,
    removeSubcategory,
    refresh: loadSubcategories,
  };
}