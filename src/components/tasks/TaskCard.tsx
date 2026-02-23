import React from 'react';
import { Task, Project } from '@/lib/tasks-db';
import { Calendar, Clock, Flag, GripVertical, Pencil, Trash2, CheckCircle2, Circle, Repeat, SquareCheckBig } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow, isValid, parse } from 'date-fns';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  onCompleteRecurring?: (taskId: string) => void;
}

const priorityConfig: Record<string, { color: string; icon: string }> = {
  low: { color: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', icon: 'border-emerald-500/50' },
  medium: { color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400', icon: 'border-amber-500/50' },
  high: { color: 'bg-rose-500/20 text-rose-600 dark:text-rose-400', icon: 'border-rose-500/50' },
};

const defaultPriorityStyle = { color: 'bg-secondary text-muted-foreground', icon: 'border-border' };

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onEdit,
  onDelete,
  onSubtaskToggle,
  onCompleteRecurring,
}) => {
  const formatDueDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) return dateStr;
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';
      return format(date, 'MMM d');
    } catch {
      return dateStr;
    }
  };

  const formatReminderTime = (reminder: string) => {
    try {
      const base = new Date();
      const date = reminder.includes('T') || reminder.includes('-')
        ? new Date(reminder)
        : parse(reminder, 'HH:mm', base);

      return isValid(date) ? format(date, 'h:mm a') : reminder;
    } catch {
      return reminder;
    }
  };

  const isDuePast = task.dueDate && isValid(new Date(task.dueDate)) && isPast(new Date(task.dueDate)) && task.status !== 'done';
  
  const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const priorityStyle = priorityConfig[task.priority] || defaultPriorityStyle;

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-4 transition-all duration-300",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5",
        "cursor-grab active:cursor-grabbing",
        task.status === 'done' && "opacity-60"
      )}
      style={{
        borderLeftWidth: '4px',
        borderLeftColor: project?.color || 'hsl(var(--border))',
      }}
    >
      {/* Drag Handle */}
      <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 transition-opacity">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Actions */}
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        {task.isRecurring && !task.isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onCompleteRecurring?.(task.id); }}
            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 transition-colors"
            title="Complete recurring task (stop cycles)"
          >
            <SquareCheckBig className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          className="p-1.5 rounded-lg bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="p-1.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="space-y-2 pr-16">
        <h4 className={cn(
          "font-medium text-sm leading-snug",
          task.status === 'done' && "line-through text-muted-foreground"
        )}>
          {task.title}
        </h4>
        
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}

        {/* Subtasks Preview */}
        {totalSubtasks > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-300"
                  style={{ width: `${subtaskProgress}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">
                {completedSubtasks}/{totalSubtasks}
              </span>
            </div>
            <div className="space-y-0.5">
              {task.subtasks?.slice(0, 2).map(subtask => (
                <div 
                  key={subtask.id}
                  className="flex items-center gap-1.5 text-[11px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubtaskToggle?.(task.id, subtask.id);
                  }}
                >
                  {subtask.completed ? (
                    <CheckCircle2 className="w-3 h-3 text-primary" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "truncate cursor-pointer hover:text-foreground transition-colors",
                    subtask.completed ? "line-through text-muted-foreground" : "text-muted-foreground"
                  )}>
                    {subtask.title}
                  </span>
                </div>
              ))}
              {totalSubtasks > 2 && (
                <span className="text-[10px] text-muted-foreground/70 ml-4">
                  +{totalSubtasks - 2} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Priority */}
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
            priorityStyle.color
          )}>
            <Flag className="w-2.5 h-2.5" />
            {task.priority || 'medium'}
          </span>

          {/* Due Date */}
          {task.dueDate && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
              isDuePast 
                ? "bg-destructive/20 text-destructive" 
                : "bg-secondary text-muted-foreground"
            )}>
              <Calendar className="w-2.5 h-2.5" />
              {formatDueDate(task.dueDate)}
            </span>
          )}

          {/* Reminder */}
          {task.reminder && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/20 text-accent-foreground">
              <Clock className="w-2.5 h-2.5" />
              {formatReminderTime(task.reminder)}
            </span>
          )}

          {/* Project */}
          {project && (
            <span 
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{ backgroundColor: `${project.color}20`, color: project.color }}
            >
              {project.name}
            </span>
          )}

          {/* Recurring */}
          {task.isRecurring && (
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
              task.isCompleted
                ? "bg-muted text-muted-foreground"
                : "bg-primary/15 text-primary"
            )}>
              <Repeat className="w-2.5 h-2.5" />
              {task.isCompleted ? 'Completed' : task.recurringFrequency ? task.recurringFrequency.charAt(0).toUpperCase() + task.recurringFrequency.slice(1) : 'Recurring'}
              {(task.completedCycles || 0) > 0 && (
                <span className="ml-0.5 font-bold">#{task.completedCycles}</span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
