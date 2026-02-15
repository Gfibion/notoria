import React, { useState, useEffect } from 'react';
import { Project, Task, PROJECT_COLORS, saveProject, Subtask } from '@/lib/tasks-db';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Edit3,
  Flag,
  ListTodo,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

interface ProjectDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  tasks: Task[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
  isCreating?: boolean;
  onCreateProject?: (project: Project) => void;
}

export const ProjectDetailDialog: React.FC<ProjectDetailDialogProps> = ({
  isOpen,
  onClose,
  project,
  tasks,
  onSaveProject,
  onDeleteProject,
  onEditTask,
  onDeleteTask,
  onSubtaskToggle,
  isCreating = false,
  onCreateProject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const projectTasks = tasks.filter(t => t.projectId === project?.id);
  const todoTasks = projectTasks.filter(t => t.status === 'todo');
  const inProgressTasks = projectTasks.filter(t => t.status === 'in-progress');
  const doneTasks = projectTasks.filter(t => t.status === 'done');
  const totalTasks = projectTasks.length;
  const completedTasks = doneTasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  useEffect(() => {
    if (isCreating) {
      setName('');
      setDescription('');
      setColor('#6366f1');
      setStartDate('');
      setEndDate('');
      setIsEditing(true);
    } else if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setColor(project.color);
      setStartDate(project.startDate?.split('T')[0] || '');
      setEndDate(project.endDate?.split('T')[0] || '');
      setIsEditing(false);
    }
  }, [project, isOpen, isCreating]);

  const handleSave = async () => {
    if (!name.trim()) return;
    if (isCreating) {
      const { createProject } = await import('@/lib/tasks-db');
      const newProject = await createProject({
        name: name.trim(),
        description: description.trim(),
        color,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
      });
      onCreateProject?.(newProject);
      toast.success('Project created');
      onClose();
      return;
    }
    if (!project) return;
    const updated: Project = {
      ...project,
      name: name.trim(),
      description: description.trim(),
      color,
      startDate: startDate ? new Date(startDate).toISOString() : undefined,
      endDate: endDate ? new Date(endDate).toISOString() : undefined,
    };
    await saveProject(updated);
    onSaveProject(updated);
    setIsEditing(false);
    toast.success('Project updated');
  };

  const handleDelete = () => {
    if (!project) return;
    onDeleteProject(project.id);
    onClose();
  };

  if (!project && !isCreating) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-rose-500';
      case 'medium': return 'text-amber-500';
      default: return 'text-emerald-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done': return 'bg-emerald-500/15 text-emerald-600';
      case 'in-progress': return 'bg-amber-500/15 text-amber-600';
      default: return 'bg-secondary text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with project color band */}
        <div
          className="h-2 w-full rounded-t-lg"
          style={{ backgroundColor: color }}
        />

        <div className="p-6 space-y-6">
          <DialogHeader className="space-y-1">
            {isCreating && (
              <DialogTitle className="font-display text-xl">New Project</DialogTitle>
            )}
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl font-display font-semibold"
                  autoFocus
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Project description — goals, scope, key outcomes..."
                  rows={3}
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <Calendar className="w-3.5 h-3.5" /> Start Date
                    </Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5 text-xs">
                      <CalendarClock className="w-3.5 h-3.5" /> End Date
                    </Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Color</Label>
                  <div className="flex gap-1.5 flex-wrap">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={cn(
                          "w-7 h-7 rounded-full transition-transform",
                          color === c && "ring-2 ring-offset-2 ring-primary scale-110"
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSave} disabled={!name.trim()}>
                    <Save className="w-3.5 h-3.5 mr-1.5" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : project ? (
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <DialogTitle className="font-display text-xl">
                      {project.name}
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDelete}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {project.description}
                  </p>
                )}
                {(project.startDate || project.endDate) && (
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {project.startDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(project.startDate), 'MMM d, yyyy')}
                      </span>
                    )}
                    {project.startDate && project.endDate && <span>→</span>}
                    {project.endDate && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {format(new Date(project.endDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : null}
          </DialogHeader>

          {/* Progress overview */}
          {!isEditing && project && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-semibold">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-secondary/50 p-3 text-center">
                  <p className="text-lg font-bold">{todoTasks.length}</p>
                  <p className="text-xs text-muted-foreground">To Do</p>
                </div>
                <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-amber-600">{inProgressTasks.length}</p>
                  <p className="text-xs text-muted-foreground">In Progress</p>
                </div>
                <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
                  <p className="text-lg font-bold text-emerald-600">{doneTasks.length}</p>
                  <p className="text-xs text-muted-foreground">Done</p>
                </div>
              </div>
            </div>
          )}

          {/* Task list */}
          {!isEditing && project && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <ListTodo className="w-4 h-4" />
                  Tasks ({totalTasks})
                </h4>
              </div>

              {projectTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <Target className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tasks in this project yet</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Create tasks and assign them to this project
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-64 overflow-y-auto scrollbar-thin">
                  <AnimatePresence>
                    {projectTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-secondary/50 transition-colors cursor-pointer"
                        onClick={() => onEditTask(task)}
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : task.status === 'in-progress' ? (
                          <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            task.status === 'done' && "line-through text-muted-foreground"
                          )}>
                            {task.title}
                          </p>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length} subtasks
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Flag className={cn("w-3.5 h-3.5", getPriorityColor(task.priority))} />
                          <span className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                            getStatusBadge(task.status)
                          )}>
                            {task.status.replace('-', ' ')}
                          </span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}

          {/* Meta info */}
          {!isEditing && project && (
            <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
              Created {format(new Date(project.createdAt), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
