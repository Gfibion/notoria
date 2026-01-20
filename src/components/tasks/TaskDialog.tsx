import React, { useState, useEffect } from 'react';
import { Task, Project, PROJECT_COLORS, createProject, Subtask, generateId } from '@/lib/tasks-db';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Clock, Flag, Folder, Plus, X, ListTodo, CheckCircle2, Circle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
  task?: Task | null;
  projects: Project[];
  onCreateProject: (project: Project) => void;
  defaultStatus?: Task['status'];
}

export const TaskDialog: React.FC<TaskDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  task,
  projects,
  onCreateProject,
  defaultStatus = 'todo',
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Task['status']>(defaultStatus);
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [reminder, setReminder] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtask, setNewSubtask] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState(PROJECT_COLORS[0]);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate?.split('T')[0] || '');
      setReminder(task.reminder || '');
      setProjectId(task.projectId || '');
      setSubtasks(task.subtasks || []);
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('medium');
      setDueDate('');
      setReminder('');
      setProjectId('');
      setSubtasks([]);
    }
    setNewSubtask('');
  }, [task, defaultStatus, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      ...(task && { id: task.id }),
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
      reminder: reminder || undefined,
      projectId: projectId || undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
    // Note: Dialog closing is handled by the parent component after save completes
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    const project = await createProject({
      name: newProjectName.trim(),
      color: newProjectColor,
    });
    onCreateProject(project);
    setProjectId(project.id);
    setShowNewProject(false);
    setNewProjectName('');
  };

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks(prev => [...prev, { id: generateId(), title: newSubtask.trim(), completed: false }]);
    setNewSubtask('');
  };

  const handleToggleSubtask = (subtaskId: string) => {
    setSubtasks(prev => prev.map(s => 
      s.id === subtaskId ? { ...s, completed: !s.completed } : s
    ));
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== subtaskId));
  };

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'bg-emerald-500' },
    { value: 'medium', label: 'Medium', color: 'bg-amber-500' },
    { value: 'high', label: 'High', color: 'bg-rose-500' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            {task ? 'Edit Task' : 'New Task'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="text-base"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5" />
              Subtasks
            </Label>
            <div className="space-y-2">
              <AnimatePresence>
                {subtasks.map((subtask) => (
                  <motion.div
                    key={subtask.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center gap-2 group"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggleSubtask(subtask.id)}
                      className="flex-shrink-0 p-0.5"
                    >
                      {subtask.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-primary" />
                      ) : (
                        <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                      )}
                    </button>
                    <span className={cn(
                      "flex-1 text-sm",
                      subtask.completed && "line-through text-muted-foreground"
                    )}>
                      {subtask.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubtask(subtask.id)}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 rounded transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div className="flex gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask..."
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSubtask();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={handleAddSubtask}
                  disabled={!newSubtask.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5" />
                Priority
              </Label>
              <div className="flex gap-1">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value as Task['priority'])}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                      priority === opt.value
                        ? `${opt.color} text-white shadow-md`
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Due Date & Reminder */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Due Date
              </Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Reminder
              </Label>
              <Input
                type="time"
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              />
            </div>
          </div>

          {/* Project */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5" />
              Project
            </Label>
            {!showNewProject ? (
              <div className="flex gap-2">
                <Select value={projectId || "none"} onValueChange={(v) => setProjectId(v === "none" ? "" : v)}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: p.color }}
                          />
                          {p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewProject(true)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3 rounded-lg bg-secondary/50 border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">New Project</span>
                  <button
                    type="button"
                    onClick={() => setShowNewProject(false)}
                    className="p-1 hover:bg-secondary rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <Input
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                />
                <div className="flex gap-1.5 flex-wrap">
                  {PROJECT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewProjectColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full transition-transform",
                        newProjectColor === color && "ring-2 ring-offset-2 ring-primary scale-110"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                >
                  Create Project
                </Button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              {task ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
