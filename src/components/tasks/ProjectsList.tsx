import React from 'react';
import { Project, Task } from '@/lib/tasks-db';
import { Folder, Layers, Plus, Trash2, Calendar, CalendarClock, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Progress } from '@/components/ui/progress';

interface ProjectsListProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectId?: string;
  onSelectProject: (projectId?: string) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProject: () => void;
  onOpenProject?: (project: Project) => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  tasks,
  selectedProjectId,
  onSelectProject,
  onDeleteProject,
  onNewProject,
  onOpenProject,
}) => {
  const getTaskCount = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId && t.status !== 'done').length;
  };

  const getProgress = (projectId: string) => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    if (projectTasks.length === 0) return 0;
    return Math.round((projectTasks.filter(t => t.status === 'done').length / projectTasks.length) * 100);
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-card to-card/50 overflow-hidden">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
              <Folder className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold">Projects</h3>
          </div>
          <button
            onClick={onNewProject}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-2 space-y-1">
        {/* All Tasks */}
        <button
          onClick={() => onSelectProject(undefined)}
          className={cn(
            "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all",
            !selectedProjectId 
              ? "bg-primary/10 text-primary" 
              : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
          )}
        >
          <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-accent" />
          <span className="flex-1 text-left text-sm font-medium">All Tasks</span>
          <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
            {tasks.filter(t => t.status !== 'done').length}
          </span>
        </button>

        {projects.map(project => {
          const progress = getProgress(project.id);
          const activeCount = getTaskCount(project.id);
          const totalCount = tasks.filter(t => t.projectId === project.id).length;

          return (
            <div key={project.id} className="group relative">
              <div
                className={cn(
                  "w-full rounded-xl transition-all border",
                  selectedProjectId === project.id 
                    ? "bg-primary/5 border-primary/20" 
                    : "border-transparent hover:bg-secondary/50"
                )}
              >
                {/* Color band */}
                <div
                  className="h-1 rounded-t-xl"
                  style={{ backgroundColor: project.color }}
                />

                <div className="p-2.5 space-y-2">
                  {/* Title row */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: project.color }}
                      />
                      <span
                        className="text-sm font-semibold truncate hover:underline cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenProject?.(project);
                        }}
                      >
                        {project.name}
                      </span>
                    </button>
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full flex-shrink-0">
                      {activeCount}
                    </span>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 pl-5">
                      {project.description}
                    </p>
                  )}

                  {/* Dates */}
                  {(project.startDate || project.endDate) && (
                    <div className="flex items-center gap-3 pl-5 text-[10px] text-muted-foreground">
                      {project.startDate && (
                        <span className="flex items-center gap-0.5">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(project.startDate), 'MMM d')}
                        </span>
                      )}
                      {project.startDate && project.endDate && <span>→</span>}
                      {project.endDate && (
                        <span className="flex items-center gap-0.5">
                          <CalendarClock className="w-3 h-3" />
                          {format(new Date(project.endDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Modules indicator */}
                  {project.modules && project.modules.length > 0 && (
                    <div className="flex items-center gap-1.5 pl-5 text-[10px] text-muted-foreground">
                      <Layers className="w-3 h-3" />
                      <span>
                        {project.modules.filter(m => m.status === 'completed').length}/{project.modules.length} modules
                      </span>
                    </div>
                  )}

                  {/* Progress bar */}
                  {totalCount > 0 && (
                    <div className="pl-5 space-y-1">
                      <Progress value={progress} className="h-1.5" />
                      <p className="text-[10px] text-muted-foreground">
                        {totalCount - activeCount}/{totalCount} done
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
                className="absolute right-2 top-4 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="py-6 text-center">
            <Target className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <button
              onClick={onNewProject}
              className="text-xs text-primary hover:underline mt-1"
            >
              Create your first project
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
