import React, { useState, useRef } from 'react';
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
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const dragCounter = useRef(0);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTaskId(taskId);
    
    // Create custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    const ghostElement = dragElement.cloneNode(true) as HTMLElement;
    ghostElement.style.position = 'absolute';
    ghostElement.style.top = '-1000px';
    ghostElement.style.width = `${rect.width}px`;
    ghostElement.style.transform = 'rotate(3deg)';
    ghostElement.style.opacity = '0.9';
    ghostElement.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 0.25)';
    document.body.appendChild(ghostElement);
    e.dataTransfer.setDragImage(ghostElement, rect.width / 2, 20);
    
    // Remove ghost after drag starts
    requestAnimationFrame(() => {
      document.body.removeChild(ghostElement);
    });
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setIsDragOver(false);
    setDropIndicatorIndex(null);
    dragCounter.current = 0;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Calculate drop position based on mouse position
    const container = e.currentTarget as HTMLElement;
    const taskElements = container.querySelectorAll('[data-task-card]');
    const mouseY = e.clientY;
    
    let newIndex = tasks.length;
    taskElements.forEach((el, index) => {
      const rect = el.getBoundingClientRect();
      const midPoint = rect.top + rect.height / 2;
      if (mouseY < midPoint && newIndex === tasks.length) {
        newIndex = index;
      }
    });
    
    setDropIndicatorIndex(newIndex);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
      setDropIndicatorIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setDropIndicatorIndex(null);
    dragCounter.current = 0;
    
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
        isDragOver && "ring-2 ring-primary/60 border-primary/60 bg-primary/5 scale-[1.02] shadow-xl shadow-primary/10"
      )}
    >
      {/* Header */}
      <div className={cn("p-4 relative overflow-hidden transition-transform duration-200", gradient, isDragOver && "scale-[0.98]")}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl bg-white/20 backdrop-blur-sm transition-transform duration-200",
              isDragOver && "scale-110"
            )}>
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
      <div 
        className={cn(
          "flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin transition-all duration-200",
          isDragOver && "bg-primary/5"
        )}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {tasks.map((task, index) => (
          <React.Fragment key={task.id}>
            {/* Drop indicator line */}
            {dropIndicatorIndex === index && isDragOver && (
              <div className="h-1 rounded-full bg-primary animate-pulse mx-1 transition-all duration-150" />
            )}
            <div
              data-task-card
              draggable
              onDragStart={(e) => handleDragStart(e, task.id)}
              onDragEnd={handleDragEnd}
              className={cn(
                "transition-all duration-200",
                draggedTaskId === task.id && "opacity-40 scale-95"
              )}
            >
              <TaskCard
                task={task}
                project={getProjectForTask(task)}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                isDragging={draggedTaskId === task.id}
              />
            </div>
          </React.Fragment>
        ))}

        {/* Drop indicator at end */}
        {dropIndicatorIndex === tasks.length && isDragOver && tasks.length > 0 && (
          <div className="h-1 rounded-full bg-primary animate-pulse mx-1 transition-all duration-150" />
        )}

        {tasks.length === 0 && (
          <div className={cn(
            "py-8 text-center transition-all duration-200 rounded-xl border-2 border-dashed",
            isDragOver 
              ? "border-primary/50 bg-primary/10" 
              : "border-transparent"
          )}>
            <div className={cn(
              "w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-3 transition-transform duration-200",
              isDragOver && "scale-110"
            )}>
              {icon}
            </div>
            <p className="text-sm text-muted-foreground">
              {isDragOver ? "Drop here" : "No tasks yet"}
            </p>
          </div>
        )}
      </div>

      {/* Add Task */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={() => onAddTask(status)}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all duration-200 group"
        >
          <Plus className="w-4 h-4 group-hover:scale-110 group-hover:rotate-90 transition-transform duration-200" />
          <span className="text-sm font-medium">Add Task</span>
        </button>
      </div>
    </div>
  );
};