import { appSchema, tableSchema } from '@nozbe/watermelondb';

/**
 * Watermelon schema v1 for Notoria.
 *
 * Field names use snake_case per Watermelon convention. The adapter layer
 * (`src/lib/db.ts`, `src/lib/tasks-db.ts`, `src/lib/pdf-cache-db.ts`) maps
 * them back to the existing camelCase TS interfaces so no call site needs
 * to change.
 *
 * `created_at` / `updated_at` are stored as unix millis (numbers) for
 * cross-platform stability (matches Watermelon SQLite adapter behaviour).
 */
export const notoriaSchema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'notes',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'content', type: 'string' },
        { name: 'workspace', type: 'string', isIndexed: true },
        { name: 'subcategory', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'is_pinned', type: 'boolean' },
        { name: 'is_starred', type: 'boolean' },
        { name: 'is_deleted', type: 'boolean', isIndexed: true },
        { name: 'deleted_at', type: 'number', isOptional: true },
        { name: 'tags_json', type: 'string' },
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'workspaces',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'color', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'order_index', type: 'number' },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'subcategories',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'workspace_id', type: 'string', isIndexed: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'settings',
      columns: [
        { name: 'payload_json', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'status', type: 'string', isIndexed: true },
        { name: 'priority', type: 'string' },
        { name: 'due_date', type: 'string', isOptional: true, isIndexed: true },
        { name: 'reminder', type: 'string', isOptional: true },
        { name: 'project_id', type: 'string', isOptional: true, isIndexed: true },
        { name: 'subtasks_json', type: 'string', isOptional: true },
        { name: 'is_recurring', type: 'boolean', isOptional: true },
        { name: 'recurring_frequency', type: 'string', isOptional: true },
        { name: 'completed_cycles', type: 'number', isOptional: true },
        { name: 'is_completed', type: 'boolean', isOptional: true },
        { name: 'is_trail_record', type: 'boolean', isOptional: true },
        { name: 'trail_cycle_number', type: 'number', isOptional: true },
        { name: 'parent_recurring_task_id', type: 'string', isOptional: true },
        { name: 'trail_completed_at', type: 'string', isOptional: true },
        { name: 'order_index', type: 'number' },
        { name: 'created_at_iso', type: 'string' },
        { name: 'updated_at_iso', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'projects',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'color', type: 'string' },
        { name: 'icon', type: 'string' },
        { name: 'start_date', type: 'string', isOptional: true },
        { name: 'end_date', type: 'string', isOptional: true },
        { name: 'modules_json', type: 'string', isOptional: true },
        { name: 'created_at_iso', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'pdf_cache',
      columns: [
        { name: 'file_name', type: 'string' },
        { name: 'data_b64', type: 'string' },
        { name: 'size', type: 'number' },
        { name: 'cached_at', type: 'number', isIndexed: true },
      ],
    }),
    tableSchema({
      name: 'legacy_backups',
      columns: [
        { name: 'payload_json', type: 'string' },
        { name: 'created_at', type: 'number' },
      ],
    }),
  ],
});
