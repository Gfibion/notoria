import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Workspace, Subcategory, getSubcategoriesByWorkspace } from '@/lib/db';
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
  Star,
  Trash2,
  Settings,
  ChevronDown,
  ChevronRight,
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
  selectedSubcategory: string | null;
  onSelectWorkspace: (id: string | null) => void;
  onSelectSubcategory: (subcategory: string | null) => void;
  onNewNote: () => void;
  onOpenSearch: () => void;
  onOpenTrash: () => void;
  onOpenSettings: () => void;
  onShowStarred: () => void;
  showStarred: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function Sidebar({
  workspaces,
  selectedWorkspace,
  selectedSubcategory,
  onSelectWorkspace,
  onSelectSubcategory,
  onNewNote,
  onOpenSearch,
  onOpenTrash,
  onOpenSettings,
  onShowStarred,
  showStarred,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [workspaceSubcategories, setWorkspaceSubcategories] = useState<Record<string, Subcategory[]>>({});

  // Load subcategories for all workspaces
  useEffect(() => {
    const loadAllSubcategories = async () => {
      const subcatMap: Record<string, Subcategory[]> = {};
      for (const ws of workspaces) {
        const subcats = await getSubcategoriesByWorkspace(ws.id);
        if (subcats.length > 0) {
          subcatMap[ws.id] = subcats;
        }
      }
      setWorkspaceSubcategories(subcatMap);
    };
    loadAllSubcategories();
  }, [workspaces]);

  // Auto-expand workspace if a subcategory is selected
  useEffect(() => {
    if (selectedWorkspace && selectedSubcategory) {
      setExpandedWorkspaces(prev => new Set([...prev, selectedWorkspace]));
    }
  }, [selectedWorkspace, selectedSubcategory]);

  const toggleWorkspaceExpand = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWorkspaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workspaceId)) {
        newSet.delete(workspaceId);
      } else {
        newSet.add(workspaceId);
      }
      return newSet;
    });
  };

  const handleWorkspaceClick = (workspaceId: string) => {
    onSelectSubcategory(null); // Reset subcategory when selecting workspace
    onSelectWorkspace(workspaceId);
  };

  const handleSubcategoryClick = (workspaceId: string, subcategoryName: string) => {
    onSelectWorkspace(workspaceId);
    onSelectSubcategory(subcategoryName);
  };

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
            onClick={() => {
              onSelectSubcategory(null);
              onSelectWorkspace(null);
            }}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              selectedWorkspace === null && !showStarred && !selectedSubcategory
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <BookOpen className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>All Notes</span>}
          </button>
          
          {/* Starred Notes */}
          <button
            onClick={onShowStarred}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
              showStarred
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
            )}
          >
            <Star className="w-4 h-4 flex-shrink-0 text-gold" />
            {!collapsed && <span>Starred</span>}
          </button>

          {workspaces.map((workspace) => {
            const Icon = iconMap[workspace.icon] || iconMap.default;
            const subcats = workspaceSubcategories[workspace.id] || [];
            const hasSubcats = subcats.length > 0;
            const isExpanded = expandedWorkspaces.has(workspace.id);
            const isWorkspaceSelected = selectedWorkspace === workspace.id && !showStarred && !selectedSubcategory;
            
            return (
              <div key={workspace.id}>
                <button
                  onClick={() => handleWorkspaceClick(workspace.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isWorkspaceSelected
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                  )}
                >
                  {/* Expand/Collapse toggle for workspaces with subcategories */}
                  {!collapsed && hasSubcats && (
                    <button
                      onClick={(e) => toggleWorkspaceExpand(workspace.id, e)}
                      className="p-0.5 -ml-1 hover:bg-sidebar-accent rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  )}
                  {!collapsed && !hasSubcats && <div className="w-4" />}
                  
                  <Icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: workspace.color }}
                  />
                  {!collapsed && <span>{workspace.name}</span>}
                </button>
                
                {/* Subcategories */}
                {!collapsed && hasSubcats && isExpanded && (
                  <div className="ml-8 mt-1 space-y-1">
                    {subcats.map((subcat) => (
                      <button
                        key={subcat.id}
                        onClick={() => handleSubcategoryClick(workspace.id, subcat.name)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors',
                          selectedWorkspace === workspace.id && selectedSubcategory === subcat.name
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                        )}
                      >
                        <Hash className="w-3 h-3 flex-shrink-0" />
                        <span>{subcat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Trash */}
        <div className="px-2 mt-4">
          <button
            onClick={onOpenTrash}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50"
          >
            <Trash2 className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Trash</span>}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className={cn('p-3 border-t border-sidebar-border', collapsed && 'flex flex-col items-center gap-2')}>
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={onOpenSettings}
          className={cn(
            'text-muted-foreground hover:text-foreground transition-colors',
            !collapsed && 'w-full justify-start mb-2'
          )}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Settings</span>}
        </Button>
        <ThemeToggle collapsed={collapsed} />
      </div>
    </aside>
  );
}