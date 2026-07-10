/**
 * Notoria tasks/projects data layer — WatermelonDB-backed.
 *
 * Public interfaces and function signatures are unchanged from the previous
 * `idb`-based implementation.
 */

import { Q } from '@nozbe/watermelondb';
import { database, tasksCollection, projectsCollection } from './watermelon';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

export type RecurringFrequency = 'daily' | 'weekly' | 'monthly';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  reminder?: string;
  projectId?: string;
  subtasks?: Subtask[];
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  completedCycles?: number;
  isCompleted?: boolean;
  isTrailRecord?: boolean;
  trailCycleNumber?: number;
  parentRecurringTaskId?: string;
  trailCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface ProjectModule {
  id: string;
  name: string;
  description?: string;
  status: 'planned' | 'in-progress' | 'completed';
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  startDate?: string;
  endDate?: string;
  modules?: ProjectModule[];
  createdAt: string;
}

// ---------- mappers ----------

function rowToTask(rec: any): Task {
  const r = rec._raw;
  let subtasks: Subtask[] | undefined;
  try {
    subtasks = r.subtasks_json ? JSON.parse(r.subtasks_json) : undefined;
  } catch {
    subtasks = undefined;
  }
  return {
    id: r.id,
    title: r.title ?? '',
    description: r.description ?? undefined,
    status: (r.status as Task['status']) ?? 'todo',
    priority: (r.priority as Task['priority']) ?? 'medium',
    dueDate: r.due_date ?? undefined,
    reminder: r.reminder ?? undefined,
    projectId: r.project_id ?? undefined,
    subtasks,
    isRecurring: r.is_recurring ?? undefined,
    recurringFrequency: (r.recurring_frequency as RecurringFrequency | undefined) ?? undefined,
    completedCycles: r.completed_cycles ?? undefined,
    isCompleted: r.is_completed ?? undefined,
    isTrailRecord: r.is_trail_record ?? undefined,
    trailCycleNumber: r.trail_cycle_number ?? undefined,
    parentRecurringTaskId: r.parent_recurring_task_id ?? undefined,
    trailCompletedAt: r.trail_completed_at ?? undefined,
    createdAt: r.created_at_iso ?? new Date().toISOString(),
    updatedAt: r.updated_at_iso ?? new Date().toISOString(),
    order: Number(r.order_index ?? 0),
  };
}

function writeTaskFields(rec: any, task: Task): void {
  rec._raw.title = task.title ?? '';
  rec._raw.description = task.description ?? null;
  rec._raw.status = task.status ?? 'todo';
  rec._raw.priority = task.priority ?? 'medium';
  rec._raw.due_date = task.dueDate ?? null;
  rec._raw.reminder = task.reminder ?? null;
  rec._raw.project_id = task.projectId ?? null;
  rec._raw.subtasks_json = task.subtasks ? JSON.stringify(task.subtasks) : null;
  rec._raw.is_recurring = task.isRecurring == null ? null : (task.isRecurring ? 1 : 0);
  rec._raw.recurring_frequency = task.recurringFrequency ?? null;
  rec._raw.completed_cycles = task.completedCycles ?? null;
  rec._raw.is_completed = task.isCompleted == null ? null : (task.isCompleted ? 1 : 0);
  rec._raw.is_trail_record = task.isTrailRecord == null ? null : (task.isTrailRecord ? 1 : 0);
  rec._raw.trail_cycle_number = task.trailCycleNumber ?? null;
  rec._raw.parent_recurring_task_id = task.parentRecurringTaskId ?? null;
  rec._raw.trail_completed_at = task.trailCompletedAt ?? null;
  rec._raw.order_index = Number(task.order ?? 0);
  rec._raw.created_at_iso = task.createdAt ?? new Date().toISOString();
  rec._raw.updated_at_iso = task.updatedAt ?? new Date().toISOString();
}

function rowToProject(rec: any): Project {
  const r = rec._raw;
  let modules: ProjectModule[] | undefined;
  try {
    modules = r.modules_json ? JSON.parse(r.modules_json) : undefined;
  } catch {
    modules = undefined;
  }
  return {
    id: r.id,
    name: r.name ?? '',
    description: r.description ?? undefined,
    color: r.color ?? '#6366f1',
    icon: r.icon ?? 'folder',
    startDate: r.start_date ?? undefined,
    endDate: r.end_date ?? undefined,
    modules,
    createdAt: r.created_at_iso ?? new Date().toISOString(),
  };
}

function writeProjectFields(rec: any, project: Project): void {
  rec._raw.name = project.name ?? '';
  rec._raw.description = project.description ?? null;
  rec._raw.color = project.color ?? '#6366f1';
  rec._raw.icon = project.icon ?? 'folder';
  rec._raw.start_date = project.startDate ?? null;
  rec._raw.end_date = project.endDate ?? null;
  rec._raw.modules_json = project.modules ? JSON.stringify(project.modules) : null;
  rec._raw.created_at_iso = project.createdAt ?? new Date().toISOString();
}

// ---------- id helper (unchanged surface) ----------

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// ---------- task ops ----------

export const getAllTasks = async (): Promise<Task[]> => {
  try {
    const rows = await tasksCollection().query().fetch();
    return rows.map(rowToTask).sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const getTasksByStatus = async (status: Task['status']): Promise<Task[]> => {
  try {
    const rows = await tasksCollection().query(Q.where('status', status)).fetch();
    return rows.map(rowToTask).sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting tasks by status:', error);
    return [];
  }
};

export const saveTask = async (task: Task): Promise<void> => {
  try {
    const updated: Task = { ...task, updatedAt: new Date().toISOString() };
    await database.write(async () => {
      try {
        const rec = await tasksCollection().find(task.id);
        await rec.update((r: any) => writeTaskFields(r, updated));
      } catch {
        await tasksCollection().create((r: any) => {
          r._raw.id = task.id;
          writeTaskFields(r, updated);
        });
      }
    });
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  try {
    await database.write(async () => {
      try {
        const rec = await tasksCollection().find(id);
        await rec.destroyPermanently();
      } catch {
        /* not found */
      }
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  try {
    const all = await tasksCollection().query().fetch();
    const maxOrder = all.length > 0
      ? Math.max(...all.map((r: any) => Number(r._raw.order_index ?? 0)))
      : 0;

    const task: Task = {
      id: generateId(),
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      status: taskData.status || 'todo',
      priority: taskData.priority || 'medium',
      dueDate: taskData.dueDate,
      reminder: taskData.reminder,
      projectId: taskData.projectId,
      subtasks: taskData.subtasks,
      isRecurring: taskData.isRecurring || false,
      recurringFrequency: taskData.recurringFrequency,
      completedCycles: taskData.completedCycles || 0,
      isCompleted: taskData.isCompleted || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: maxOrder + 1,
    };

    await database.write(async () => {
      await tasksCollection().create((r: any) => {
        r._raw.id = task.id;
        writeTaskFields(r, task);
      });
    });
    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// ---------- project ops ----------

export const getAllProjects = async (): Promise<Project[]> => {
  try {
    const rows = await projectsCollection().query().fetch();
    return rows.map(rowToProject);
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
};

export const saveProject = async (project: Project): Promise<void> => {
  try {
    await database.write(async () => {
      try {
        const rec = await projectsCollection().find(project.id);
        await rec.update((r: any) => writeProjectFields(r, project));
      } catch {
        await projectsCollection().create((r: any) => {
          r._raw.id = project.id;
          writeProjectFields(r, project);
        });
      }
    });
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    await database.write(async () => {
      try {
        const rec = await projectsCollection().find(id);
        await rec.destroyPermanently();
      } catch {
        /* not found */
      }
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

export const createProject = async (projectData: Partial<Project>): Promise<Project> => {
  try {
    const project: Project = {
      id: generateId(),
      name: projectData.name || 'New Project',
      description: projectData.description || '',
      color: projectData.color || '#6366f1',
      icon: projectData.icon || 'folder',
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      modules: projectData.modules || [],
      createdAt: new Date().toISOString(),
    };
    await database.write(async () => {
      await projectsCollection().create((r: any) => {
        r._raw.id = project.id;
        writeProjectFields(r, project);
      });
    });
    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

// ---------- due / upcoming ----------

export const getTasksDueToday = async (): Promise<Task[]> => {
  try {
    const rows = await tasksCollection().query().fetch();
    const tasks = rows.map(rowToTask);
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate?.startsWith(today) && t.status !== 'done');
  } catch (error) {
    console.error('Error getting tasks due today:', error);
    return [];
  }
};

export const getUpcomingTasks = async (days: number = 7): Promise<Task[]> => {
  try {
    const rows = await tasksCollection().query().fetch();
    const tasks = rows.map(rowToTask);
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return tasks
      .filter(t => {
        if (!t.dueDate || t.status === 'done') return false;
        const dueDate = new Date(t.dueDate);
        return dueDate >= now && dueDate <= future;
      })
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  } catch (error) {
    console.error('Error getting upcoming tasks:', error);
    return [];
  }
};

export const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b',
];

export const advanceDueDate = (
  dueDate: string | undefined,
  frequency: RecurringFrequency,
): string | undefined => {
  if (!dueDate) return undefined;
  const date = new Date(dueDate);
  if (isNaN(date.getTime())) return undefined;
  switch (frequency) {
    case 'daily': date.setDate(date.getDate() + 1); break;
    case 'weekly': date.setDate(date.getDate() + 7); break;
    case 'monthly': date.setMonth(date.getMonth() + 1); break;
  }
  return date.toISOString();
};
