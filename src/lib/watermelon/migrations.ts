import { schemaMigrations, addColumns } from '@nozbe/watermelondb/Schema/migrations';

/**
 * Watermelon schema migrations.
 *
 * v1 -> v2: adds `is_secret` to notes (Safe Folder). Existing notes keep all
 * their data and default to non-secret.
 */
export const notoriaMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        addColumns({
          table: 'notes',
          columns: [{ name: 'is_secret', type: 'boolean', isOptional: true }],
        }),
      ],
    },
  ],
});
