import { cn } from '@/lib/utils';
import { Workspace } from '@/lib/db';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  BookOpen,
  User,
  Briefcase,
  Lightbulb,
  Folder,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';

const iconMap: Record<string, React.ElementType> = {
  user: User,
  briefcase: Briefcase,
  lightbulb: Lightbulb,
  folder: Folder,
  default: Hash,
};

interface SidebarProps {
  workspaces: Workspace[];
  selectedWorkspace: string | null;
  onSelectWorkspace: (id: string | null) => void;
  onNewNote: () => void;
  onOpenSearch: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  workspaces,
  selectedWorkspace,
  onSelectWorkspace,
  onNewNote,
  onOpenSearch,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ease-out',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-gold" />
            <span className="font-display text-xl font-semibold tracking-tight text-sidebar-foreground">
              Notoria
            </span>
          </div>
        )}
        {collapsed && <BookOpen className="w-6 h-6 text-gold mx-auto" />}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className={cn('text-muted-foreground hover:text-foreground', collapsed && 'mx-auto mt-2')}
        >
          {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </Button>
      </div>

      {/* Actions */}
      <div className={cn('p-3 space-y-2', collapsed && 'flex flex-col items-center')}>
        <Button
          onClick={onNewNote}
          className={cn(
            'bg-primary text-primary-foreground hover:bg-primary/90 transition-all',
            collapsed ? 'w-10 h-10 p-0' : 'w-full justify-start gap-2'
          )}
        >
          <Plus className="w-4 h-4" />
          {!collapsed && <span>New Note</span>}
        </Button>
        <Button
          variant="outline"
          onClick={onOpenSearch}
          className={cn(
            'border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-all',
            collapsed ? 'w-10 h-10 p-0' : 'w-full justify-start gap-2'
          )}
        >
          <Search className="w-4 h-4" />
          {!collapsed && (
            <>
              <span>Search</span>
              <kbd className="ml-auto text-xs bg-muted px-1.5 py-0.5 rounded">⌘K</kbd>
            </>
          )}
        </Button>
      </div>

      {/* Workspaces */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {!collapsed && (
          <div className="px-4 py-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workspaces
            </span>
          </div>
        )}
        <nav className="px-2 space-y-1">
          <button
            onClick={() => onSelectWorkspace(null)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              selectedWorkspace === null
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>All Notes</span>}
          </button>
          {workspaces.map((workspace) => {
            const Icon = iconMap[workspace.icon] || iconMap.default;
            return (
              <button
                key={workspace.id}
                onClick={() => onSelectWorkspace(workspace.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  selectedWorkspace === workspace.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
              >
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: workspace.color }}
                />
                {!collapsed && <span>{workspace.name}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer */}
      <div className={cn('p-3 border-t border-sidebar-border', collapsed && 'flex flex-col items-center gap-2')}>
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  );
}
