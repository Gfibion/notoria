import React from 'react';
import { Task, Project } from '@/lib/tasks-db';
import { Calendar, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { cn } from '@/lib/utils';

interface UpcomingWidgetProps {
  tasks: Task[];
  projects: Project[];
  onTaskClick: (task: Task) => void;
}

export const UpcomingWidget: React.FC<UpcomingWidgetProps> = ({
  tasks,
  projects,
  onTaskClick,
}) => {
  const getProjectForTask = (task: Task) => {
    return projects.find(p => p.id === task.projectId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'EEE, MMM d');
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    const dateKey = task.dueDate?.split('T')[0] || 'no-date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(task);
    return acc;
  }, {} as Record<string, Task[]>);

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5">
            <Calendar className="w-5 h-5 text-accent" />
          </div>
          <h3 className="font-semibold">Upcoming</h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="w-10 h-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            No upcoming tasks
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Tasks with due dates will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-gradient-to-r from-accent/10 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-accent/30 to-accent/10">
              <Calendar className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Upcoming</h3>
              <p className="text-xs text-muted-foreground">{tasks.length} tasks ahead</p>
            </div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border/30 max-h-80 overflow-y-auto scrollbar-thin">
        {Object.entries(groupedTasks).map(([dateKey, dateTasks]) => (
          <div key={dateKey} className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                isToday(new Date(dateKey)) 
                  ? "bg-accent text-accent-foreground" 
                  : "bg-secondary text-muted-foreground"
              )}>
                {formatDate(dateKey)}
              </span>
            </div>
            <div className="space-y-1.5">
              {dateTasks.map(task => {
                const project = getProjectForTask(task);
                return (
                  <button
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors group text-left"
                  >
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project?.color || 'hsl(var(--muted))' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      {task.reminder && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="w-3 h-3" />
                          {format(new Date(`2000-01-01T${task.reminder}`), 'h:mm a')}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
