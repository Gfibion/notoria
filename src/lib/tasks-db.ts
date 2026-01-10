import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  reminder?: string;
  projectId?: string;
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
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
        taskStore.createIndex('by-status', 'status');
        taskStore.createIndex('by-project', 'projectId');
        taskStore.createIndex('by-due-date', 'dueDate');

        // Projects store
        db.createObjectStore('projects', { keyPath: 'id' });
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
  const db = await getDB();
  const tasks = await db.getAll('tasks');
  return tasks.sort((a, b) => a.order - b.order);
};

export const getTasksByStatus = async (status: Task['status']): Promise<Task[]> => {
  const db = await getDB();
  const tasks = await db.getAllFromIndex('tasks', 'by-status', status);
  return tasks.sort((a, b) => a.order - b.order);
};

export const saveTask = async (task: Task): Promise<void> => {
  const db = await getDB();
  await db.put('tasks', { ...task, updatedAt: new Date().toISOString() });
};

export const deleteTask = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('tasks', id);
};

export const createTask = async (taskData: Partial<Task>): Promise<Task> => {
  const db = await getDB();
  const allTasks = await db.getAll('tasks');
  const maxOrder = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.order)) : 0;
  
  const task: Task = {
    id: generateId(),
    title: taskData.title || 'New Task',
    description: taskData.description || '',
    status: taskData.status || 'todo',
    priority: taskData.priority || 'medium',
    dueDate: taskData.dueDate,
    reminder: taskData.reminder,
    projectId: taskData.projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: maxOrder + 1,
  };
  
  await db.put('tasks', task);
  return task;
};

// Project operations
export const getAllProjects = async (): Promise<Project[]> => {
  const db = await getDB();
  return db.getAll('projects');
};

export const saveProject = async (project: Project): Promise<void> => {
  const db = await getDB();
  await db.put('projects', project);
};

export const deleteProject = async (id: string): Promise<void> => {
  const db = await getDB();
  await db.delete('projects', id);
};

export const createProject = async (projectData: Partial<Project>): Promise<Project> => {
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
};

// Task due today / upcoming
export const getTasksDueToday = async (): Promise<Task[]> => {
  const db = await getDB();
  const tasks = await db.getAll('tasks');
  const today = new Date().toISOString().split('T')[0];
  return tasks.filter(t => t.dueDate?.startsWith(today) && t.status !== 'done');
};

export const getUpcomingTasks = async (days: number = 7): Promise<Task[]> => {
  const db = await getDB();
  const tasks = await db.getAll('tasks');
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  
  return tasks.filter(t => {
    if (!t.dueDate || t.status === 'done') return false;
    const dueDate = new Date(t.dueDate);
    return dueDate >= now && dueDate <= future;
  }).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
};

export const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', 
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
];
