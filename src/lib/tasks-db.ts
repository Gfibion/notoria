import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

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
  createdAt: string;
  updatedAt: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: string;
}

interface TasksDB extends DBSchema {
  tasks: {
    key: string;
    value: Task;
    indexes: { 'by-status': string; 'by-project': string; 'by-due-date': string };
  };
  projects: {
    key: string;
    value: Project;
  };
}

let dbPromise: Promise<IDBPDatabase<TasksDB>> | null = null;

const getDB = async (): Promise<IDBPDatabase<TasksDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<TasksDB>('notoria-tasks', 1, {
      upgrade(db) {
        // Tasks store
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('by-status', 'status');
          taskStore.createIndex('by-project', 'projectId');
          taskStore.createIndex('by-due-date', 'dueDate');
        }

        // Projects store
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Task operations
export const getAllTasks = async (): Promise<Task[]> => {
  try {
    const db = await getDB();
    const tasks = await db.getAll('tasks');
    return tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting tasks:', error);
    return [];
  }
};

export const getTasksByStatus = async (status: Task['status']): Promise<Task[]> => {
  try {
    const db = await getDB();
    const tasks = await db.getAllFromIndex('tasks', 'by-status', status);
    return tasks.sort((a, b) => (a.order || 0) - (b.order || 0));
  } catch (error) {
    console.error('Error getting tasks by status:', error);
    return [];
  }
};

export const saveTask = async (task: Task): Promise<void> => {
  try {
    const db = await getDB();
    await db.put('tasks', { ...task, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
};

export const deleteTask = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    await db.delete('tasks', id);
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  try {
    const db = await getDB();
    const allTasks = await db.getAll('tasks');
    const maxOrder = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.order || 0)) : 0;
    
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: maxOrder + 1,
    };
    
    await db.put('tasks', task);
    return task;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Project operations
export const getAllProjects = async (): Promise<Project[]> => {
  try {
    const db = await getDB();
    return db.getAll('projects');
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
};

export const saveProject = async (project: Project): Promise<void> => {
  try {
    const db = await getDB();
    await db.put('projects', project);
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const deleteProject = async (id: string): Promise<void> => {
  try {
    const db = await getDB();
    await db.delete('projects', id);
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
      color: projectData.color || '#6366f1',
      icon: projectData.icon || 'folder',
      createdAt: new Date().toISOString(),
    };
    
    const db = await getDB();
    await db.put('projects', project);
    return project;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

// Task due today / upcoming
export const getTasksDueToday = async (): Promise<Task[]> => {
  try {
    const db = await getDB();
    const tasks = await db.getAll('tasks');
    const today = new Date().toISOString().split('T')[0];
    return tasks.filter(t => t.dueDate?.startsWith(today) && t.status !== 'done');
  } catch (error) {
    console.error('Error getting tasks due today:', error);
    return [];
  }
};

export const getUpcomingTasks = async (days: number = 7): Promise<Task[]> => {
  try {
    const db = await getDB();
    const tasks = await db.getAll('tasks');
    const now = new Date();
    const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    
    return tasks.filter(t => {
      if (!t.dueDate || t.status === 'done') return false;
      const dueDate = new Date(t.dueDate);
      return dueDate >= now && dueDate <= future;
    }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  } catch (error) {
    console.error('Error getting upcoming tasks:', error);
    return [];
  }
};

export const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];
