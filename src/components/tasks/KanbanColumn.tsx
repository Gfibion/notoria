import React, { useState } from 'react';
import { Task, Project } from '@/lib/tasks-db';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  title: string;
  status: Task['status'];
  tasks: Task[];
  projects: Project[];
  onAddTask: (status: Task['status']) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDropTask: (taskId: string, newStatus: Task['status']) => void;
  gradient: string;
  icon: React.ReactNode;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  status,
  tasks,
  projects,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDropTask,
  gradient,
  icon,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      onDropTask(taskId, status);
    }
  };

  const getProjectForTask = (task: Task) => {
    return projects.find(p => p.id === task.projectId);
  };

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300",
        isDragOver && "ring-2 ring-primary/50 border-primary/50 bg-primary/5"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className={cn("p-4 relative overflow-hidden", gradient)}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{title}</h3>
              <p className="text-white/70 text-xs">{tasks.length} tasks</p>
            </div>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/70 hover:text-white">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin">
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={(e) => handleDragStart(e, task.id)}
            onDragEnd={handleDragEnd}
          >
            <TaskCard
              task={task}
              project={getProjectForTask(task)}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              isDragging={draggedTaskId === task.id}
            />
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-3">
              {icon}
            </div>
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </div>
        )}
      </div>

      {/* Add Task */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={() => onAddTask(status)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-medium">Add Task</span>
        </button>
      </div>
    </div>
  );
};
