import React, { useState, useEffect, useCallback } from 'react';
import {
  Task,
  Project,
  getAllTasks,
  getAllProjects,
  saveTask,
  deleteTask,
  createTask,
  deleteProject,
  getTasksDueToday,
  getUpcomingTasks,
} from '@/lib/tasks-db';
import { TasksHeader } from '@/components/tasks/TasksHeader';
import { KanbanColumn } from '@/components/tasks/KanbanColumn';
import { TaskDialog } from '@/components/tasks/TaskDialog';
import { ProjectsList } from '@/components/tasks/ProjectsList';
import { UpcomingWidget } from '@/components/tasks/UpcomingWidget';
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState<Task['status']>('todo');
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [allTasks, allProjects, today, upcoming] = await Promise.all([
        getAllTasks(),
        getAllProjects(),
        getTasksDueToday(),
        getUpcomingTasks(7),
      ]);
      setTasks(allTasks || []);
      setProjects(allProjects || []);
      setTodayTasks(today || []);
      setUpcomingTasks(upcoming || []);
    } catch (error) {
      console.error('Error loading tasks data:', error);
      toast.error('Failed to load tasks');
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesProject = !selectedProjectId || task.projectId === selectedProjectId;
    return matchesSearch && matchesProject;
  });

  const todoTasks = filteredTasks.filter(t => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in-progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'done');

  // Handlers
  const handleNewTask = (status: Task['status'] = 'todo') => {
    setEditingTask(null);
    setDefaultStatus(status);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (editingTask) {
        await saveTask({ ...editingTask, ...taskData } as Task);
        toast.success('Task updated');
      } else {
        await createTask(taskData);
        toast.success('Task created');
      }
      await loadData();
      setTaskDialogOpen(false);
    } catch (error) {
      console.error('Error saving task:', error);
      toast.error('Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      toast.success('Task deleted');
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleDropTask = async (taskId: string, newStatus: Task['status']) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.status !== newStatus) {
        await saveTask({ ...task, status: newStatus });
        toast.success(`Moved to ${newStatus.replace('-', ' ')}`);
        await loadData();
      }
    } catch (error) {
      console.error('Error moving task:', error);
      toast.error('Failed to move task');
    }
  };

  const handleSubtaskToggle = async (taskId: string, subtaskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.subtasks) {
        const updatedSubtasks = task.subtasks.map(s => 
          s.id === subtaskId ? { ...s, completed: !s.completed } : s
        );
        await saveTask({ ...task, subtasks: updatedSubtasks });
        await loadData();
      }
    } catch (error) {
      console.error('Error toggling subtask:', error);
    }
  };

  const handleCreateProject = (project: Project) => {
    setProjects(prev => [...prev, project]);
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      if (selectedProjectId === projectId) {
        setSelectedProjectId(undefined);
      }
      await loadData();
      toast.success('Project deleted');
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-primary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        <TasksHeader
          view={view}
          onViewChange={setView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onNewTask={() => handleNewTask()}
          todayCount={todayTasks.length}
        />

        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden lg:block w-72 p-4 space-y-4 sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto scrollbar-thin">
            <ProjectsList
              projects={projects}
              tasks={tasks}
              selectedProjectId={selectedProjectId}
              onSelectProject={setSelectedProjectId}
              onDeleteProject={handleDeleteProject}
              onNewProject={() => handleNewTask()}
            />
            <UpcomingWidget
              tasks={upcomingTasks}
              projects={projects}
              onTaskClick={handleEditTask}
            />
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6">
            {view === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <KanbanColumn
                  title="To Do"
                  status="todo"
                  tasks={todoTasks}
                  projects={projects}
                  onAddTask={handleNewTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDropTask={handleDropTask}
                  onSubtaskToggle={handleSubtaskToggle}
                  gradient="bg-gradient-to-br from-slate-600 to-slate-700"
                  icon={<Circle className="w-5 h-5 text-white" />}
                />
                <KanbanColumn
                  title="In Progress"
                  status="in-progress"
                  tasks={inProgressTasks}
                  projects={projects}
                  onAddTask={handleNewTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDropTask={handleDropTask}
                  onSubtaskToggle={handleSubtaskToggle}
                  gradient="bg-gradient-to-br from-amber-500 to-orange-600"
                  icon={<Clock className="w-5 h-5 text-white" />}
                />
                <KanbanColumn
                  title="Done"
                  status="done"
                  tasks={doneTasks}
                  projects={projects}
                  onAddTask={handleNewTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onDropTask={handleDropTask}
                  onSubtaskToggle={handleSubtaskToggle}
                  gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
                  icon={<CheckCircle2 className="w-5 h-5 text-white" />}
                />
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-2">
                {filteredTasks.map(task => (
                  <div
                    key={task.id}
                    onClick={() => handleEditTask(task)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ 
                        backgroundColor: projects.find(p => p.id === task.projectId)?.color || 'hsl(var(--muted))' 
                      }}
                    />
                    <div className="flex-1">
                      <p className={`font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">{task.description}</p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      task.status === 'done' 
                        ? 'bg-emerald-500/20 text-emerald-600' 
                        : task.status === 'in-progress'
                        ? 'bg-amber-500/20 text-amber-600'
                        : 'bg-secondary text-muted-foreground'
                    }`}>
                      {task.status.replace('-', ' ')}
                    </span>
                  </div>
                ))}
                {filteredTasks.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No tasks found</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <TaskDialog
        isOpen={taskDialogOpen}
        onClose={() => setTaskDialogOpen(false)}
        onSave={handleSaveTask}
        task={editingTask}
        projects={projects}
        onCreateProject={handleCreateProject}
        defaultStatus={defaultStatus}
      />
    </div>
  );
};

export default Tasks;
