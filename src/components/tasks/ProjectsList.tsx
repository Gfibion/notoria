import React from 'react';
import { Project, Task } from '@/lib/tasks-db';
import { Folder, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectsListProps {
  projects: Project[];
  tasks: Task[];
  selectedProjectId?: string;
  onSelectProject: (projectId?: string) => void;
  onDeleteProject: (projectId: string) => void;
  onNewProject: () => void;
}

export const ProjectsList: React.FC<ProjectsListProps> = ({
  projects,
  tasks,
  selectedProjectId,
  onSelectProject,
  onDeleteProject,
  onNewProject,
}) => {
  const getTaskCount = (projectId: string) => {
    return tasks.filter(t => t.projectId === projectId && t.status !== 'done').length;
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

        {projects.map(project => (
          <div key={project.id} className="group relative">
            <button
              onClick={() => onSelectProject(project.id)}
              className={cn(
                "w-full flex items-center gap-3 p-2.5 rounded-xl transition-all",
                selectedProjectId === project.id 
                  ? "bg-primary/10 text-foreground" 
                  : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="flex-1 text-left text-sm font-medium truncate">
                {project.name}
              </span>
              <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                {getTaskCount(project.id)}
              </span>
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteProject(project.id); }}
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {projects.length === 0 && (
          <div className="py-6 text-center">
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
