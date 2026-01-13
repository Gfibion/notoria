import React from 'react';
import { Task, Project } from '@/lib/tasks-db';
import { Calendar, Clock, Flag, GripVertical, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isTomorrow, isPast } from 'date-fns';

interface TaskCardProps {
  task: Task;
  project?: Project;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  isDragging?: boolean;
}

const priorityConfig = {
  low: { color: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400', icon: 'border-emerald-500/50' },
  medium: { color: 'bg-amber-500/20 text-amber-600 dark:text-amber-400', icon: 'border-amber-500/50' },
  high: { color: 'bg-rose-500/20 text-rose-600 dark:text-rose-400', icon: 'border-rose-500/50' },
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  project,
  onEdit,
  onDelete,
  isDragging,
}) => {
  const formatDueDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM d');
  };

  const isDuePast = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';

  return (
    <div
      className={cn(
        "group relative rounded-xl border bg-card p-4 transition-all duration-200 ease-out",
        "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1",
        "cursor-grab active:cursor-grabbing select-none",
        isDragging && "opacity-0 scale-90 pointer-events-none",
        task.status === 'done' && "opacity-60",
        "touch-none" // Prevents scroll issues on touch devices
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
      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Priority */}
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide",
            priorityConfig[task.priority].color
          )}>
            <Flag className="w-2.5 h-2.5" />
            {task.priority}
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
              {format(new Date(task.reminder), 'h:mm a')}
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
        </div>
      </div>
    </div>
  );
};
