import React, { useState, useRef } from 'react';
import { Task, Project } from '@/lib/tasks-db';
import { TaskCard } from './TaskCard';
import { Plus, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface KanbanColumnProps {
  title: string;
  status: Task['status'];
  tasks: Task[];
  projects: Project[];
  onAddTask: (status: Task['status']) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onDropTask: (taskId: string, newStatus: Task['status']) => void;
  onSubtaskToggle?: (taskId: string, subtaskId: string) => void;
  onCompleteRecurring?: (taskId: string) => void;
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
  onSubtaskToggle,
  onCompleteRecurring,
  gradient,
  icon,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropIndicatorIndex, setDropIndicatorIndex] = useState<number | null>(null);
  const columnRef = useRef<HTMLDivElement>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    
    // Add dragging class for visual feedback
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    
    // Calculate drop position
    const container = columnRef.current?.querySelector('.tasks-container');
    if (container) {
      const cards = Array.from(container.querySelectorAll('.task-card-wrapper'));
      const mouseY = e.clientY;
      
      let insertIndex = cards.length;
      for (let i = 0; i < cards.length; i++) {
        const rect = cards[i].getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        if (mouseY < midY) {
          insertIndex = i;
          break;
        }
      }
      setDropIndicatorIndex(insertIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = columnRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setIsDragOver(false);
        setDropIndicatorIndex(null);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDropIndicatorIndex(null);
    
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && taskId.trim()) {
      onDropTask(taskId, status);
    }
  };

  const getProjectForTask = (task: Task) => {
    return projects.find(p => p.id === task.projectId);
  };

  const DropIndicator = () => (
    <motion.div
      initial={{ opacity: 0, scaleY: 0.5 }}
      animate={{ opacity: 1, scaleY: 1 }}
      exit={{ opacity: 0, scaleY: 0.5 }}
      className="h-1 bg-gradient-to-r from-primary via-primary to-primary/50 rounded-full my-2 shadow-lg shadow-primary/30"
    />
  );

  return (
    <div
      ref={columnRef}
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all duration-300",
        isDragOver && "ring-2 ring-primary/50 border-primary/50 bg-primary/5 scale-[1.02]"
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
            <div 
              className={cn(
                "p-2 rounded-xl bg-white/20 backdrop-blur-sm transition-transform",
                isDragOver && "scale-110 rotate-[5deg]"
              )}
            >
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
      <div className="tasks-container flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin">
        <AnimatePresence mode="popLayout">
          {tasks.map((task, index) => (
            <React.Fragment key={task.id}>
              {dropIndicatorIndex === index && isDragOver && <DropIndicator />}
              <div
                className="task-card-wrapper cursor-grab active:cursor-grabbing"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, task.id)}
                onDragEnd={handleDragEnd}
              >
                <TaskCard
                  task={task}
                  project={getProjectForTask(task)}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onSubtaskToggle={onSubtaskToggle}
                  onCompleteRecurring={onCompleteRecurring}
                />
              </div>
            </React.Fragment>
          ))}
          {dropIndicatorIndex === tasks.length && isDragOver && <DropIndicator />}
        </AnimatePresence>

        {tasks.length === 0 && !isDragOver && (
          <div className="py-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-3">
              {icon}
            </div>
            <p className="text-sm text-muted-foreground">No tasks yet</p>
          </div>
        )}

        {tasks.length === 0 && isDragOver && (
          <div className="py-8 text-center border-2 border-dashed border-primary/50 rounded-xl bg-primary/5">
            <p className="text-sm text-primary font-medium">Drop task here</p>
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
